"""LangChain-based RAG service with MongoDB vector store and MemMachine integration."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

# Use the newer langchain-mongodb package for MongoDB Atlas Vector Search
try:
    from langchain_mongodb import MongoDBAtlasVectorSearch
except ImportError:
    # Fallback to deprecated version if new package is not installed
    from langchain_community.vectorstores import MongoDBAtlasVectorSearch
from pymongo import MongoClient
from pymongo.database import Database

from app.database import get_database, get_client
from app.services.memmachine_client import MemMachineMCPClient

# Load .env file to ensure environment variables are available
_env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(_env_path)


class LangChainRAGService:
    """LangChain-based RAG service with MongoDB vector store."""

    def __init__(
        self,
        db: Optional[Database] = None,
        memmachine_client: Optional[MemMachineMCPClient] = None,
        embedding_model: Optional[str] = None,
        llm_model: Optional[str] = None,
        llm_provider: str = "openai",
    ):
        """
        Initialize the LangChain RAG service.

        Args:
            db: MongoDB database instance
            memmachine_client: MemMachine client instance
            embedding_model: Embedding model name (default: OpenAI text-embedding-3-small)
            llm_model: LLM model name (default: gpt-4o-mini)
            llm_provider: LLM provider ("openai" or "anthropic")
        """
        self.db = db if db is not None else get_database()
        self.memmachine_client = memmachine_client

        # Initialize embeddings
        embedding_api_key = os.getenv("OPENAI_API_KEY")
        if not embedding_api_key:
            # Don't fail at initialization - will fail when actually trying to use embeddings
            print("Warning: OPENAI_API_KEY not set. Embeddings will fail when used.")
            embedding_api_key = "not-set"

        self.embeddings = OpenAIEmbeddings(
            model=embedding_model or "text-embedding-3-small",
            openai_api_key=embedding_api_key,
        )

        # Initialize LLM
        if llm_provider == "openai":
            llm_api_key = os.getenv("OPENAI_API_KEY")
            if not llm_api_key:
                raise ValueError("OPENAI_API_KEY is required for LLM")
            self.llm = ChatOpenAI(
                model=llm_model or "gpt-4o-mini",
                temperature=0.7,
                openai_api_key=llm_api_key,
            )
        elif llm_provider == "anthropic":
            llm_api_key = os.getenv("ANTHROPIC_API_KEY")
            if not llm_api_key:
                raise ValueError("ANTHROPIC_API_KEY is required for LLM")
            self.llm = ChatAnthropic(
                model=llm_model or "claude-3-haiku-20240307",
                temperature=0.7,
                anthropic_api_key=llm_api_key,
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {llm_provider}")

        # Initialize text splitter
        # Using larger chunk_size to keep customer rows intact (typically 1000-2000 chars)
        # This prevents fragmentation where one customer's info is split across chunks
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=2500,  # Increased to accommodate full customer rows
            chunk_overlap=200,
            length_function=len,
        )

        # Initialize vector store (MongoDB Atlas Vector Search)
        # Production-ready: Uses MongoDB Atlas Vector Search
        self.collection_name = "chunks"
        self.vector_search_index_name = "vector_index"  # Name of the vector search index in MongoDB Atlas
        self._initialize_vector_store()

    def _initialize_vector_store(self) -> None:
        """Initialize MongoDB Atlas Vector Search store."""
        try:
            # Get MongoDB collection
            collection = self.db[self.collection_name]
            
            # Initialize MongoDB Atlas Vector Search
            # This requires:
            # 1. MongoDB Atlas cluster (not local MongoDB)
            # 2. A vector search index named "vector_index" configured in MongoDB Atlas
            # 3. Index should be on the "embedding" field with dimension 1536 (for OpenAI embeddings)
            self.vector_store = MongoDBAtlasVectorSearch(
                collection=collection,
                embedding=self.embeddings,
                index_name=self.vector_search_index_name,
                text_key="content",  # Field name for text content
                embedding_key="embedding",  # Field name for embeddings
            )
            print(f"✅ MongoDB Atlas Vector Search initialized (index: {self.vector_search_index_name})")
        except Exception as e:
            error_msg = f"Failed to initialize MongoDB Atlas Vector Search: {e}"
            print(f"❌ {error_msg}")
            print("   Production setup requires:")
            print("   1. MongoDB Atlas cluster (not local MongoDB)")
            print("   2. A vector search index configured in MongoDB Atlas")
            print("   3. Index name: 'vector_index'")
            print("   4. Index on field 'embedding' with dimension 1536")
            print("   See MONGODB_ATLAS_VECTOR_SEARCH_SETUP.md for setup instructions")
            raise ValueError(f"{error_msg}. Please configure MongoDB Atlas Vector Search for production use.") from e

    async def _get_memmachine_client(self) -> MemMachineMCPClient:
        """Get or create MemMachine client."""
        if self.memmachine_client is None:
            from app.services.memmachine_client import get_memmachine_client

            self.memmachine_client = await get_memmachine_client()
        return self.memmachine_client

    def store_documents(
        self,
        texts: list[str],
        metadatas: Optional[list[dict[str, Any]]] = None,
        source: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Store documents in MongoDB vector store.

        Args:
            texts: List of text documents to store
            metadatas: Optional list of metadata dicts
            source: Optional source identifier

        Returns:
            Dictionary with storage results
        """
        # Create Document objects
        documents = []
        for i, text in enumerate(texts):
            metadata = {}
            if metadatas and i < len(metadatas):
                metadata = metadatas[i]
            if source:
                metadata["source"] = source
            metadata["index"] = i

            # Split text into chunks
            chunks = self.text_splitter.split_text(text)
            for j, chunk in enumerate(chunks):
                doc = Document(
                    page_content=chunk,
                    metadata={**metadata, "chunk_index": j, "total_chunks": len(chunks)},
                )
                documents.append(doc)

        # Store in vector store (MongoDB Atlas Vector Search)
        if self.vector_store:
            try:
                # Use MongoDB Atlas Vector Search - production ready
                ids = self.vector_store.add_documents(documents)
                return {
                    "success": True,
                    "document_count": len(texts),
                    "chunk_count": len(documents),
                    "ids": ids,
                    "storage_mode": "mongodb_atlas_vector_search",
                }
            except Exception as e:
                error_msg = f"MongoDB Atlas Vector Search storage failed: {e}"
                print(f"❌ {error_msg}")
                print("   This usually means:")
                print("   1. Vector search index is not configured in MongoDB Atlas")
                print("   2. Index name is incorrect (should be 'vector_index')")
                print("   3. Index field mapping is incorrect")
                raise ValueError(f"{error_msg}. Please configure MongoDB Atlas Vector Search index.") from e
        else:
            # This should not happen in production if MongoDB Atlas is properly configured
            error_msg = "MongoDB Atlas Vector Search is not initialized. Please check your configuration."
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)

    def search_documents(
        self,
        query: str,
        k: int = 5,
        filter: Optional[dict[str, Any]] = None,
    ) -> list[Document]:
        """
        Search documents using MongoDB Atlas Vector Search.

        Args:
            query: Search query
            k: Number of results to return
            filter: Optional metadata filter

        Returns:
            List of relevant documents
        """
        if self.vector_store:
            try:
                # Use MongoDB Atlas Vector Search - production ready
                # Note: MongoDBAtlasVectorSearch uses 'pre_filter' for metadata filtering
                if filter:
                    return self.vector_store.similarity_search(query, k=k, pre_filter=filter)
                else:
                    return self.vector_store.similarity_search(query, k=k)
            except Exception as e:
                error_msg = f"MongoDB Atlas Vector Search failed: {e}"
                print(f"❌ {error_msg}")
                raise ValueError(f"{error_msg}. Please check your MongoDB Atlas Vector Search configuration.") from e
        else:
            error_msg = "MongoDB Atlas Vector Search is not initialized. Please check your configuration."
            print(f"❌ {error_msg}")
            raise ValueError(error_msg)

    async def retrieve_context(
        self,
        query: str,
        k: int = 5,
        include_memories: bool = True,
        user_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Retrieve context for RAG (documents + memories).

        Args:
            query: User query
            k: Number of documents to retrieve
            include_memories: Whether to include MemMachine memories
            user_id: User ID for MemMachine

        Returns:
            Dictionary with retrieved context
        """
        # Get documents from vector store
        documents = self.search_documents(query, k=k)

        # Get memories from MemMachine if requested
        memories = []
        if include_memories:
            try:
                memmachine_client = await self._get_memmachine_client()
                memory_results = await memmachine_client.search_memory(
                    query=query,
                    limit=3,
                    user_id=user_id,
                )

                # Parse memory results
                if isinstance(memory_results, dict):
                    if "memories" in memory_results:
                        memories = memory_results["memories"]
                    elif "results" in memory_results:
                        memories = memory_results["results"]
                elif isinstance(memory_results, list):
                    memories = memory_results

                # Convert to Document format
                memory_docs = []
                for memory in memories:
                    if isinstance(memory, dict):
                        content = memory.get("content", memory.get("text", str(memory)))
                    elif isinstance(memory, str):
                        content = memory
                    else:
                        continue

                    # Skip document memories (already in documents)
                    if not content.startswith("[Document"):
                        memory_docs.append(
                            Document(
                                page_content=content,
                                metadata={"type": "memory", "source": "memmachine"},
                            )
                        )

                memories = memory_docs
            except Exception as e:
                print(f"Warning: Failed to retrieve memories: {e}")

        return {
            "documents": documents,
            "memories": memories,
            "total_context": len(documents) + len(memories),
        }

    async def rag_query(
        self,
        query: str,
        k: int = 5,
        include_memories: bool = True,
        user_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Perform a RAG query using LangChain.

        Args:
            query: User query
            k: Number of documents to retrieve
            include_memories: Whether to include MemMachine memories
            user_id: User ID for MemMachine

        Returns:
            Dictionary with answer and sources
        """
        from langchain.chains import RetrievalQA
        from langchain.prompts import PromptTemplate

        # Retrieve context
        context = await self.retrieve_context(query, k=k, include_memories=include_memories, user_id=user_id)

        # Combine documents and memories
        all_docs = context["documents"] + context["memories"]

        if not all_docs:
            return {
                "query": query,
                "answer": "No relevant context found.",
                "sources": [],
                "documents": [],
            }

        # Create a simple retrieval chain
        # Build context string
        context_parts = []
        sources = []

        for doc in all_docs:
            context_parts.append(doc.page_content)
            source = doc.metadata.get("source", "unknown")
            if source not in sources:
                sources.append(source)

        context_text = "\n\n".join(context_parts)

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
        chain = prompt | self.llm
        answer = chain.invoke({"context": context_text, "question": query})

        # Extract answer text
        if hasattr(answer, "content"):
            answer_text = answer.content
        else:
            answer_text = str(answer)

        return {
            "query": query,
            "answer": answer_text,
            "sources": sources,
            "documents": [
                {
                    "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                    "metadata": doc.metadata,
                }
                for doc in all_docs
            ],
            "total_context": context["total_context"],
        }

    async def campaign_conversation_query(
        self,
        query: str,
        k: int = 10,
        include_memories: bool = True,
        user_id: Optional[str] = None,
    ) -> dict[str, Any]:
        """
        Specialized RAG query optimized for voice conversations about campaign effectiveness.
        
        This method is designed for ElevenLabs voice conversations where an agent:
        - Targets the most active customers
        - Discusses campaign performance and effectiveness
        - Provides natural, conversational responses
        
        Args:
            query: User query about campaigns or customers
            k: Number of customer documents to retrieve (higher for finding active customers)
            include_memories: Whether to include MemMachine memories
            user_id: User ID for MemMachine
        
        Returns:
            Dictionary with conversational answer optimized for voice
        """
        from langchain.prompts import PromptTemplate

        # Retrieve context with more documents to find active customers
        context = await self.retrieve_context(query, k=k, include_memories=include_memories, user_id=user_id)

        # Combine documents and memories
        all_docs = context["documents"] + context["memories"]

        if not all_docs:
            return {
                "query": query,
                "answer": "I don't have information about that customer or campaign right now. Could you provide more details?",
                "sources": [],
                "documents": [],
                "conversation_ready": True,
            }

        # Build context string with customer information
        context_parts = []
        sources = []
        customer_summaries = []

        for doc in all_docs:
            content = doc.page_content
            metadata = doc.metadata
            
            # Extract customer info from metadata for quick reference
            customer_info = {}
            if "customer_id" in metadata:
                customer_info["id"] = metadata["customer_id"]
            if "first_name" in metadata and "last_name" in metadata:
                customer_info["name"] = f"{metadata['first_name']} {metadata['last_name']}"
            elif "email" in metadata:
                customer_info["email"] = metadata["email"]
            
            if customer_info:
                customer_summaries.append(customer_info)
            
            context_parts.append(content)
            source = metadata.get("source", "unknown")
            if source not in sources:
                sources.append(source)

        context_text = "\n\n---\n\n".join(context_parts)

        # Optimized prompt for voice conversations about campaigns
        prompt_template = """You are a helpful customer engagement agent having a voice conversation about marketing campaigns. 
Your goal is to help identify active customers and discuss campaign effectiveness in a natural, conversational way.

Use the customer data below to answer questions about:
- Which customers are most active (high purchases, engagement, lifetime value)
- How campaigns are performing (response rates, conversions, engagement metrics)
- Customer preferences and contact methods
- Campaign effectiveness and recommendations

Be conversational, natural, and concise. Speak as if you're having a friendly phone conversation.
Use specific numbers and metrics when available. If you need to identify "most active customers", 
look for high values in: total_purchases, total_spent, lifetime_value, purchase_frequency, and engagement rates.

Customer Data:
{context}

Question or Request: {question}

Provide a natural, conversational response suitable for voice (ElevenLabs TTS):"""

        prompt = PromptTemplate(
            template=prompt_template,
            input_variables=["context", "question"],
        )

        # Generate answer optimized for voice
        chain = prompt | self.llm
        answer = chain.invoke({"context": context_text, "question": query})

        # Extract answer text
        if hasattr(answer, "content"):
            answer_text = answer.content
        else:
            answer_text = str(answer)

        return {
            "query": query,
            "answer": answer_text,
            "sources": sources,
            "customers_found": len(customer_summaries),
            "customer_summaries": customer_summaries[:5],  # Top 5 for quick reference
            "documents": [
                {
                    "content": doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                    "metadata": {
                        "customer_id": doc.metadata.get("customer_id"),
                        "name": f"{doc.metadata.get('first_name', '')} {doc.metadata.get('last_name', '')}".strip(),
                        "email": doc.metadata.get("email"),
                    },
                }
                for doc in all_docs[:5]  # Top 5 documents
            ],
            "total_context": context["total_context"],
            "conversation_ready": True,  # Flag for voice system
        }

    def list_documents(self, limit: int = 100) -> dict[str, Any]:
        """List stored documents."""
        collection = self.db[self.collection_name]
        docs = list(collection.find({}, limit=limit).sort("_id", -1))

        return {
            "success": True,
            "documents": [
                {
                    "id": str(doc["_id"]),
                    "content_preview": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"],
                    "metadata": doc.get("metadata", {}),
                }
                for doc in docs
            ],
            "total": len(docs),
        }

    def delete_documents(self, source: Optional[str] = None) -> dict[str, Any]:
        """Delete documents by source."""
        collection = self.db[self.collection_name]

        if source:
            filter_query = {"metadata.source": source}
        else:
            return {"success": False, "message": "Must provide source"}

        result = collection.delete_many(filter_query)
        return {
            "success": True,
            "deleted_count": result.deleted_count,
            "message": f"Deleted {result.deleted_count} documents from source {source}",
        }

