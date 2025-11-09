"""LangChain-based RAG service with MongoDB vector store and MemMachine integration."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any, Optional

from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import TextLoader
from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings, ChatOpenAI

# Optional import for Anthropic
try:
    from langchain_anthropic import ChatAnthropic
    ANTHROPIC_AVAILABLE = True
except ImportError:
    ANTHROPIC_AVAILABLE = False
    ChatAnthropic = None

# Use the production-grade langchain-mongodb package for MongoDB Atlas Vector Search
# This is the recommended package for MongoDB Atlas Vector Search
try:
    from langchain_mongodb import MongoDBAtlasVectorSearch
    _USING_PRODUCTION_PACKAGE = True
except ImportError:
    # Fallback to deprecated version only if new package is not installed
    # NOTE: This should not be used in production - install langchain-mongodb instead
    import warnings
    warnings.warn(
        "Using deprecated langchain_community.vectorstores.MongoDBAtlasVectorSearch. "
        "Please install langchain-mongodb for production use: pip install langchain-mongodb",
        DeprecationWarning,
        stacklevel=2
    )
    from langchain_community.vectorstores import MongoDBAtlasVectorSearch
    _USING_PRODUCTION_PACKAGE = False
from pymongo import MongoClient
from pymongo.database import Database

from app.database import get_database, get_client
from app.services.memmachine_client import MemMachineMCPClient
from app.utils.data_normalization import normalize_metadata, normalize_customer_summary

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

            embedding_api_key = "not-set"

        self.embeddings = OpenAIEmbeddings(
            model=embedding_model or "text-embedding-3-small",
            openai_api_key=embedding_api_key,
        )

        # Initialize LLM lazily (only when needed for RAG queries)
        # Document storage only needs embeddings, not LLM
        self._llm = None
        self._llm_provider = llm_provider
        self._llm_model = llm_model or ("gpt-4o-mini" if llm_provider == "openai" else "claude-3-haiku-20240307")

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
            # Check if collection has documents
            doc_count = collection.count_documents({})
            if doc_count == 0:
                # Vector index is empty, will use structured data
                pass
            else:
                # Vector index has documents
                pass
        except Exception as e:
            error_msg = f"Failed to initialize MongoDB Atlas Vector Search: {e}"
            # Vector search initialization failed, will use structured data instead
            pass

            raise ValueError(f"{error_msg}. Please configure MongoDB Atlas Vector Search for production use.") from e

    @property
    def llm(self):
        """Lazy initialization of LLM (only when needed for RAG queries)."""
        if self._llm is None:
            if self._llm_provider == "openai":
                llm_api_key = os.getenv("OPENAI_API_KEY")
                if not llm_api_key:
                    raise ValueError("OPENAI_API_KEY is required for LLM. Please set it in your .env file.")
                self._llm = ChatOpenAI(
                    model=self._llm_model,
                    temperature=0.7,
                    openai_api_key=llm_api_key,
                )
            elif self._llm_provider == "anthropic":
                if not ANTHROPIC_AVAILABLE:
                    raise ValueError("Anthropic support is not available. Install with: pip install langchain-anthropic")
                llm_api_key = os.getenv("ANTHROPIC_API_KEY")
                if not llm_api_key:
                    raise ValueError("ANTHROPIC_API_KEY is required for LLM. Please set it in your .env file.")
                self._llm = ChatAnthropic(
                    model=self._llm_model,
                    temperature=0.7,
                    anthropic_api_key=llm_api_key,
                )
            else:
                raise ValueError(f"Unsupported LLM provider: {self._llm_provider}")
        return self._llm

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
                error_msg = str(e)
                error_type = type(e).__name__
                
                # Check for authentication errors
                if "AuthenticationError" in error_type or "401" in error_msg or "API key" in error_msg.lower() or "OPENAI_API_KEY" in error_msg:
                    raise ValueError(f"OpenAI API authentication failed: {error_msg}. Please set a valid OPENAI_API_KEY in your .env file.")
                
                # Check for other embedding/vector store errors
                error_msg = f"MongoDB Atlas Vector Search storage failed: {error_msg}"
                raise ValueError(f"{error_msg}. Please check your configuration.") from e
        else:
            # This should not happen in production if MongoDB Atlas is properly configured
            error_msg = "MongoDB Atlas Vector Search is not initialized. Please check your configuration."

            raise ValueError(error_msg)

    def search_documents(
        self,
        query: str,
        k: int = 5,
        filter: Optional[dict[str, Any]] = None,
    ) -> list[Document]:
        """
        Search documents using MongoDB Atlas Vector Search.
        
        Falls back to structured data if chunks are empty or vector search fails.

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
                    results = self.vector_store.similarity_search(query, k=k, pre_filter=filter)
                else:
                    results = self.vector_store.similarity_search(query, k=k)
                
                # If no results, try structured data fallback
                if not results or len(results) == 0:
                    # This is expected if chunks collection is empty or query doesn't match
                    # Structured data fallback ensures we always return relevant data
                    return self._search_structured_data(query, k)
                
                return results
            except Exception as e:
                error_msg = f"MongoDB Atlas Vector Search failed: {e}"
                # Fallback to structured data
                try:
                    return self._search_structured_data(query, k)
                except Exception as fallback_error:
                    raise ValueError(f"{error_msg}. Structured data query also failed: {fallback_error}") from e
        else:
            # If vector store not initialized, use structured data
            return self._search_structured_data(query, k)
    
    def _search_structured_data(self, query: str, k: int = 5) -> list[Document]:
        """
        Fallback: Search structured data from MongoDB collections.
        
        This method queries the customers, products, campaigns collections
        directly when vector search is not available or chunks are empty.
        """
        from langchain_core.documents import Document
        
        documents = []
        query_lower = query.lower()
        
        # Check if query is about customers
        customer_keywords = ["customer", "customers", "active", "purchase", "spent", "lifetime", "segment"]
        is_customer_query = any(keyword in query_lower for keyword in customer_keywords)
        
        if is_customer_query:
            # Get customers from structured collection
            customers_collection = self.db["customers"]
            customers = list(
                customers_collection.find({})
                .sort("total_spent", -1)
                .limit(k)
            )
            
            for customer in customers:
                # Convert customer data to searchable text
                text_parts = []
                text_parts.append(f"Customer: {customer.get('first_name', '')} {customer.get('last_name', '')}")
                text_parts.append(f"Customer ID: {customer.get('customer_id', '')}")
                text_parts.append(f"Email: {customer.get('email', '')}")
                text_parts.append(f"Segment: {customer.get('customer_segment', '')}")
                text_parts.append(f"Total Purchases: {customer.get('total_purchases', 0)}")
                text_parts.append(f"Total Spent: ${customer.get('total_spent', 0):.2f}")
                text_parts.append(f"Lifetime Value: ${customer.get('lifetime_value', 0):.2f}")
                text_parts.append(f"Average Order Value: ${customer.get('avg_order_value', 0):.2f}")
                if customer.get('loyalty_member'):
                    text_parts.append(f"Loyalty Points: {customer.get('loyalty_points', 0)}")
                
                content = ". ".join(text_parts) + "."
                
                # Create Document with customer metadata - include ALL fields for frontend
                metadata = {
                    "source": "customers",
                    "customer_id": customer.get("customer_id"),
                    "type": "customer",
                    "category": "customer_data",
                    "first_name": customer.get("first_name"),
                    "last_name": customer.get("last_name"),
                    "email": customer.get("email"),
                    "phone": customer.get("phone"),
                    "customer_segment": customer.get("customer_segment"),
                    "total_purchases": customer.get("total_purchases"),
                    "total_spent": customer.get("total_spent"),
                    "lifetime_value": customer.get("lifetime_value"),
                    "avg_order_value": customer.get("avg_order_value"),
                    "loyalty_member": customer.get("loyalty_member"),
                    "loyalty_points": customer.get("loyalty_points"),
                    "preferred_contact_method": customer.get("preferred_contact_method") or customer.get("phone"),
                    "favorite_product_category": customer.get("favorite_product_category") or customer.get("preferred_category"),
                    "preferred_category": customer.get("preferred_category") or customer.get("favorite_product_category"),
                    # Campaign engagement metrics
                    "responded_to_campaigns": customer.get("responded_to_campaigns", 0),
                    "clicked_campaigns": customer.get("clicked_campaigns", customer.get("responded_to_campaigns", 0)),
                    "converted_campaigns": customer.get("converted_campaigns", 0),
                    # Email metrics
                    "email_open_rate": customer.get("email_open_rate", 0.0),
                    "email_click_rate": customer.get("email_click_rate", 0.0),
                    # SMS metrics
                    "sms_response_rate": customer.get("sms_response_rate", 0.0),
                    # Churn and satisfaction
                    "churn_risk_score": customer.get("churn_risk_score", 0.0),
                    "satisfaction_score": customer.get("satisfaction_score", 0.0),
                    # Social media metrics
                    "social_shares": customer.get("social_shares", 0),
                    "video_completion_rate": customer.get("video_completion_rate", 0.0),
                    "app_downloads": customer.get("app_downloads", 0),
                    "store_visits": customer.get("store_visits", 0),
                    # Other metrics
                    "referrals_made": customer.get("referrals_made", 0),
                    "repeat_purchase_rate": customer.get("repeat_purchase_rate", 0.0),
                    "days_since_last_purchase": customer.get("days_since_last_purchase", 0),
                    # Dates
                    "first_purchase_date": customer.get("first_purchase_date"),
                    "last_purchase_date": customer.get("last_purchase_date"),
                }
                
                documents.append(Document(page_content=content, metadata=metadata))
        
        # Check if query is about campaigns
        campaign_keywords = ["campaign", "campaigns", "effectiveness", "performance", "response", "conversion", "email", "click"]
        is_campaign_query = any(keyword in query_lower for keyword in campaign_keywords)
        
        if is_campaign_query:
            # Get campaigns from structured collection (real data only from MongoDB)
            campaigns_collection = self.db["campaigns"]
            campaigns = list(campaigns_collection.find({}).limit(min(k, 10)))
            
            for campaign in campaigns:
                # ONLY use actual data from MongoDB - no calculations, no defaults, no mock data
                # Skip campaigns that don't have required fields or metrics
                if not campaign.get("campaign_id") or not campaign.get("name"):
                    continue  # Skip incomplete campaigns
                
                # Get ONLY real data from MongoDB
                target_segment = campaign.get("target_segment")
                response_rate = campaign.get("response_rate")
                conversion_rate = campaign.get("conversion_rate")
                open_rate = campaign.get("open_rate")
                click_rate = campaign.get("click_rate")
                total_spend = campaign.get("total_spend")
                total_revenue = campaign.get("total_revenue")
                roi = campaign.get("roi")
                channel = campaign.get("channel")
                
                # Only include campaigns that have at least some real metrics
                # Skip campaigns with no actual data (don't use calculated defaults)
                has_metrics = (
                    response_rate is not None or 
                    conversion_rate is not None or 
                    total_revenue is not None or 
                    roi is not None
                )
                
                if not has_metrics:
                    continue  # Skip campaigns with no real metrics
                
                # Convert to float only for existing values, use 0.0 for display if None
                response_rate = float(response_rate) if response_rate is not None else None
                conversion_rate = float(conversion_rate) if conversion_rate is not None else None
                open_rate = float(open_rate) if open_rate is not None else None
                click_rate = float(click_rate) if click_rate is not None else None
                total_spend = float(total_spend) if total_spend is not None else None
                total_revenue = float(total_revenue) if total_revenue is not None else None
                roi = float(roi) if roi is not None else None
                
                # Create campaign document using ONLY real data from MongoDB
                text_parts = []
                campaign_name = campaign.get('name')
                campaign_id = campaign.get('campaign_id')
                campaign_type = campaign.get('type')
                status = campaign.get('status')
                
                if campaign_name:
                    text_parts.append(f"Campaign: {campaign_name}")
                if campaign_id:
                    text_parts.append(f"Campaign ID: {campaign_id}")
                if campaign_type:
                    text_parts.append(f"Type: {campaign_type}")
                if status:
                    text_parts.append(f"Status: {status}")
                if target_segment:
                    text_parts.append(f"Target Segment: {target_segment}")
                if channel:
                    text_parts.append(f"Channel: {channel}")
                if response_rate is not None:
                    text_parts.append(f"Response Rate: {response_rate:.1f}%")
                if conversion_rate is not None:
                    text_parts.append(f"Conversion Rate: {conversion_rate:.1f}%")
                if open_rate is not None:
                    text_parts.append(f"Email Open Rate: {open_rate:.1f}%")
                if click_rate is not None:
                    text_parts.append(f"Email Click Rate: {click_rate:.1f}%")
                if total_spend is not None:
                    text_parts.append(f"Total Spend: ${total_spend:.2f}")
                if total_revenue is not None:
                    text_parts.append(f"Total Revenue: ${total_revenue:.2f}")
                if roi is not None:
                    text_parts.append(f"ROI: {roi:.1f}%")
                
                content = ". ".join(text_parts) + "."
                
                # Use ONLY real data from MongoDB - no calculated metrics, no defaults
                responded_count = campaign.get("responded_to_campaigns")
                converted_count = campaign.get("converted_campaigns")
                
                # Build metadata with ONLY real data from MongoDB
                metadata = {
                    "source": "campaigns",
                    "campaign_id": campaign_id,
                    "type": "campaign",
                    "category": "marketing",
                    "name": campaign_name,
                    "campaign_name": campaign_name,  # Also include campaign_name for frontend compatibility
                    "campaign_type": campaign_type,
                    "status": status,
                }
                
                # Only add fields that have actual data in MongoDB
                if target_segment:
                    metadata["target_segment"] = target_segment
                    metadata["customer_segment"] = target_segment  # For frontend compatibility
                
                # Campaign performance metrics - only if they exist in MongoDB
                if response_rate is not None:
                    metadata["response_rate"] = float(response_rate)
                if conversion_rate is not None:
                    metadata["conversion_rate"] = float(conversion_rate)
                if open_rate is not None:
                    metadata["open_rate"] = float(open_rate)
                    metadata["email_open_rate"] = float(open_rate)  # For frontend compatibility
                if click_rate is not None:
                    metadata["click_rate"] = float(click_rate)
                    metadata["email_click_rate"] = float(click_rate)  # For frontend compatibility
                
                # Financial metrics - only if they exist in MongoDB
                if total_spend is not None:
                    metadata["total_spend"] = float(total_spend)
                if total_revenue is not None:
                    metadata["total_revenue"] = float(total_revenue)
                if roi is not None:
                    metadata["roi"] = float(roi)
                
                # Channel information - only if it exists in MongoDB
                if channel:
                    metadata["channel"] = channel
                    metadata["preferred_contact_method"] = channel  # For frontend compatibility
                
                # Campaign engagement - only if it exists in MongoDB
                if responded_count is not None:
                    metadata["responded_to_campaigns"] = int(responded_count)
                if converted_count is not None:
                    metadata["converted_campaigns"] = int(converted_count)
                
                # Dates - only if they exist in MongoDB
                start_date = campaign.get("start_date")
                end_date = campaign.get("end_date")
                if start_date:
                    metadata["start_date"] = start_date
                if end_date:
                    metadata["end_date"] = end_date
                
                documents.append(Document(page_content=content, metadata=metadata))
        
        return documents

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
                # MemMachine is required - log error and re-raise
                # However, if it's a timeout, we can continue without memories for better UX
                error_msg = str(e)
                if "timeout" in error_msg.lower() or "Timeout" in error_msg:

                    memories = []  # Continue without memories if timeout
                else:

                    # Re-raise to fail the request - MemMachine is required for non-timeout errors
                    raise ValueError(f"MemMachine is required but unavailable: {error_msg}") from e

        # Normalize metadata for all documents
        normalized_documents = []
        for doc in documents:
            normalized_meta = normalize_metadata(doc.metadata)
            normalized_documents.append(
                Document(
                    page_content=doc.page_content,
                    metadata=normalized_meta,
                )
            )

        return {
            "documents": normalized_documents,
            "memories": memories,
            "total_context": len(normalized_documents) + len(memories),
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
            # Check if MemMachine retrieval failed
            memmachine_error = False
            if include_memories:
                try:
                    # Try to get memmachine client to check if it's available
                    await self._get_memmachine_client()
                except Exception:
                    memmachine_error = True
            
            if memmachine_error:
                return {
                    "query": query,
                    "answer": "No relevant context found. MemMachine is required but unavailable. Please start the MemMachine MCP server. See MemMachine/README.md for setup instructions.",
                    "sources": [],
                    "customers_found": 0,
                    "customer_summaries": [],
                    "documents": [],
                    "total_context": 0,
                }
            
            return {
                "query": query,
                "answer": "No relevant context found.",
                "sources": [],
                "customers_found": 0,
                "customer_summaries": [],
                "documents": [],
                "total_context": 0,
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

        # Normalize metadata for all documents before returning
        normalized_docs = []
        for doc in all_docs:
            normalized_meta = normalize_metadata(doc.metadata)
            normalized_docs.append({
                "content": doc.page_content[:200] + "..." if len(doc.page_content) > 200 else doc.page_content,
                "metadata": normalized_meta,
            })

        return {
            "query": query,
            "answer": answer_text,
            "sources": sources,
            "documents": normalized_docs,
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
                "customers_found": 0,
                "customer_summaries": [],
                "documents": [],
                "total_context": 0,
                "conversation_ready": True,
            }

        # Build context string with customer information
        context_parts = []
        sources = []
        customer_summaries = []

        for doc in all_docs:
            content = doc.page_content
            # Normalize metadata to ensure proper data types
            metadata = normalize_metadata(doc.metadata)
            
            # Extract customer info from metadata for quick reference
            # Use normalize_customer_summary to ensure consistent structure
            customer_info = normalize_customer_summary(metadata)
            
            if customer_info and ("id" in customer_info or "email" in customer_info):
                # Only add if we have at least id or email
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

        # Normalize all document metadata before returning
        normalized_documents = []
        for doc in all_docs[:20]:  # Return more documents for frontend display (up to 20)
            normalized_meta = normalize_metadata(doc.metadata)
            normalized_documents.append({
                "content": doc.page_content[:300] + "..." if len(doc.page_content) > 300 else doc.page_content,
                "metadata": normalized_meta,  # Return normalized metadata with proper types
            })

        return {
            "query": query,
            "answer": answer_text,
            "sources": sources,
            "customers_found": len(customer_summaries),
            "customer_summaries": customer_summaries[:5],  # Top 5 for quick reference
            "documents": normalized_documents,
            "total_context": context["total_context"],
            "conversation_ready": True,  # Flag for voice system
        }

    def list_documents(self, limit: int = 100) -> dict[str, Any]:
        """List stored documents."""
        collection = self.db[self.collection_name]
        docs = list(collection.find({}, limit=limit).sort("_id", -1))

        # Normalize metadata for all documents
        normalized_docs = []
        for doc in docs:
            metadata = doc.get("metadata", {})
            normalized_meta = normalize_metadata(metadata) if metadata else {}
            normalized_docs.append({
                "id": str(doc["_id"]),
                "content_preview": doc["content"][:200] + "..." if len(doc["content"]) > 200 else doc["content"],
                "metadata": normalized_meta,
            })

        return {
            "success": True,
            "documents": normalized_docs,
            "total": len(normalized_docs),
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

