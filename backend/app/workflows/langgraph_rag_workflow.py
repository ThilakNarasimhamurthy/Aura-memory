"""LangGraph workflow for advanced RAG pipeline."""

from __future__ import annotations

from typing import Any, Optional, TypedDict

from langchain_core.documents import Document
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from langgraph.checkpoint.memory import MemorySaver

from app.services.langchain_rag_service import LangChainRAGService
from app.services.memmachine_client import MemMachineMCPClient


class RAGState(TypedDict):
    """State for RAG workflow."""

    query: str
    documents: list[Document]
    memories: list[Document]
    context: str
    answer: Optional[str]
    sources: list[str]
    user_id: Optional[str]
    k: int


class LangGraphRAGWorkflow:
    """LangGraph workflow for RAG pipeline with multiple stages."""

    def __init__(
        self,
        rag_service: LangChainRAGService,
        memmachine_client: Optional[MemMachineMCPClient] = None,
    ):
        """
        Initialize the LangGraph RAG workflow.

        Args:
            rag_service: LangChain RAG service instance
            memmachine_client: MemMachine client instance
        """
        self.rag_service = rag_service
        self.memmachine_client = memmachine_client
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow."""
        workflow = StateGraph(RAGState)

        # Add nodes - note: LangGraph handles sync/async mixing
        workflow.add_node("retrieve_documents", self._retrieve_documents)
        workflow.add_node("retrieve_memories", self._retrieve_memories_wrapper)
        workflow.add_node("combine_context", self._combine_context)
        workflow.add_node("generate_answer", self._generate_answer)

        # Define edges
        workflow.set_entry_point("retrieve_documents")
        workflow.add_edge("retrieve_documents", "retrieve_memories")
        workflow.add_edge("retrieve_memories", "combine_context")
        workflow.add_edge("combine_context", "generate_answer")
        workflow.add_edge("generate_answer", END)

        # Compile with memory for state management
        memory = MemorySaver()
        return workflow.compile(checkpointer=memory)

    def _retrieve_documents(self, state: RAGState) -> RAGState:
        """Retrieve documents from vector store."""
        query = state["query"]
        k = state.get("k", 5)

        documents = self.rag_service.search_documents(query, k=k)
        state["documents"] = documents

        return state

    def _retrieve_memories_wrapper(self, state: RAGState) -> RAGState:
        """Wrapper for async memory retrieval (sync wrapper for LangGraph)."""
        import asyncio

        # Run async function in sync context
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        if loop.is_running():
            # If loop is running, we need to use a different approach
            # For now, skip memories if we can't run async
            state["memories"] = []
            return state

        return loop.run_until_complete(self._retrieve_memories(state))

    async def _retrieve_memories(self, state: RAGState) -> RAGState:
        """Retrieve memories from MemMachine."""
        if not self.memmachine_client:
            state["memories"] = []
            return state

        query = state["query"]
        user_id = state.get("user_id")

        try:
            memory_results = await self.memmachine_client.search_memory(
                query=query,
                limit=3,
                user_id=user_id,
            )

            # Parse memory results
            memories = []
            if isinstance(memory_results, dict):
                if "memories" in memory_results:
                    memory_list = memory_results["memories"]
                elif "results" in memory_results:
                    memory_list = memory_results["results"]
                else:
                    memory_list = []
            elif isinstance(memory_results, list):
                memory_list = memory_results
            else:
                memory_list = []

            # Convert to Document format
            for memory in memory_list:
                if isinstance(memory, dict):
                    content = memory.get("content", memory.get("text", str(memory)))
                elif isinstance(memory, str):
                    content = memory
                else:
                    continue

                # Skip document memories (already in documents)
                if not content.startswith("[Document"):
                    memories.append(
                        Document(
                            page_content=content,
                            metadata={"type": "memory", "source": "memmachine"},
                        )
                    )

            state["memories"] = memories
        except Exception as e:
            print(f"Warning: Failed to retrieve memories: {e}")
            state["memories"] = []

        return state

    def _combine_context(self, state: RAGState) -> RAGState:
        """Combine documents and memories into context."""
        documents = state.get("documents", [])
        memories = state.get("memories", [])

        context_parts = []
        sources = []

        # Add documents
        for doc in documents:
            context_parts.append(f"[Document: {doc.metadata.get('source', 'unknown')}]\n{doc.page_content}")
            source = doc.metadata.get("source", "unknown")
            if source not in sources:
                sources.append(source)

        # Add memories
        for memory in memories:
            context_parts.append(f"[Memory]\n{memory.page_content}")
            if "memmachine" not in sources:
                sources.append("memmachine")

        context_text = "\n\n".join(context_parts)
        state["context"] = context_text
        state["sources"] = sources

        return state

    def _generate_answer(self, state: RAGState) -> RAGState:
        """Generate answer using LLM."""
        from langchain.prompts import PromptTemplate

        query = state["query"]
        context = state.get("context", "")

        if not context:
            state["answer"] = "No relevant context found."
            return state

        # Create prompt
        prompt_template = """Use the following context to answer the question. If you don't know the answer, say so.

Context:
{context}

Question: {question}

Answer:"""

        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"],
        )

        # Generate answer
        chain = prompt | self.rag_service.llm
        answer = chain.invoke({"context": context, "question": query})

        # Extract answer text
        if hasattr(answer, "content"):
            answer_text = answer.content
        else:
            answer_text = str(answer)

        state["answer"] = answer_text

        return state

    async def run(
        self,
        query: str,
        k: int = 5,
        user_id: Optional[str] = None,
        config: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        """
        Run the RAG workflow.

        Args:
            query: User query
            k: Number of documents to retrieve
            user_id: User ID for MemMachine
            config: Optional LangGraph config

        Returns:
            Dictionary with answer and sources
        """
        initial_state: RAGState = {
            "query": query,
            "documents": [],
            "memories": [],
            "context": "",
            "answer": None,
            "sources": [],
            "user_id": user_id,
            "k": k,
        }

        config = config or {}
        # LangGraph graphs are synchronous by default, but we can use ainvoke for async
        try:
            result = await self.graph.ainvoke(initial_state, config=config)
        except AttributeError:
            # Fallback to sync invocation if ainvoke is not available
            import asyncio
            result = await asyncio.to_thread(self.graph.invoke, initial_state, config)

        return {
            "query": query,
            "answer": result.get("answer"),
            "sources": result.get("sources", []),
            "documents": [
                {
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in result.get("documents", [])
            ],
            "memories": [
                {
                    "content": mem.page_content[:200] + "..." if len(mem.page_content) > 200 else mem.page_content,
                    "metadata": mem.metadata,
                }
                for mem in result.get("memories", [])
            ],
            "total_context": len(result.get("documents", [])) + len(result.get("memories", [])),
        }

