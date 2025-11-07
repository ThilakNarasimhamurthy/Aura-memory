"""LLM service for answer generation in RAG pipeline."""

from __future__ import annotations

import os
from typing import Optional

import httpx


class LLMService:
    """Service for LLM-based answer generation."""

    def __init__(
        self,
        provider: str = "openai",
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: str = "gpt-4o-mini",
    ):
        """
        Initialize the LLM service.

        Args:
            provider: LLM provider ("openai", "anthropic", "aws_bedrock")
            api_key: API key for the provider
            base_url: Base URL for API (optional, for custom endpoints)
            model: Model name to use
        """
        self.provider = provider
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        self.base_url = base_url
        self.model = model
        self.client = httpx.AsyncClient(timeout=60.0)

    async def generate_answer(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate an answer using an LLM based on the query and context.

        Args:
            query: User query
            context: Retrieved context (documents + memories)
            system_prompt: Optional system prompt

        Returns:
            Generated answer
        """
        if self.provider == "openai" or self.provider == "anthropic":
            return await self._generate_openai_style(query, context, system_prompt)
        elif self.provider == "aws_bedrock":
            return await self._generate_aws_bedrock(query, context, system_prompt)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    async def _generate_openai_style(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Generate answer using OpenAI-style API."""
        if not self.api_key:
            raise ValueError("API key is required for LLM generation")

        default_system_prompt = """You are a helpful assistant that answers questions based on the provided context.
Use the context to answer the user's question. If the context doesn't contain enough information,
say so. Be concise and accurate."""

        system_prompt = system_prompt or default_system_prompt

        base_url = self.base_url or (
            "https://api.openai.com/v1" if self.provider == "openai" else "https://api.anthropic.com/v1"
        )

        if self.provider == "openai":
            url = f"{base_url}/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:",
                    },
                ],
                "temperature": 0.7,
                "max_tokens": 1000,
            }
        else:  # Anthropic
            url = f"{base_url}/messages"
            headers = {
                "x-api-key": self.api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            }
            payload = {
                "model": self.model,
                "max_tokens": 1000,
                "system": system_prompt,
                "messages": [
                    {
                        "role": "user",
                        "content": f"Context:\n{context}\n\nQuestion: {query}\n\nAnswer:",
                    }
                ],
            }

        try:
            response = await self.client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

            if self.provider == "openai":
                return data["choices"][0]["message"]["content"]
            else:  # Anthropic
                return data["content"][0]["text"]
        except Exception as e:
            raise ValueError(f"Failed to generate answer: {str(e)}")

    async def _generate_aws_bedrock(
        self,
        query: str,
        context: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """Generate answer using AWS Bedrock."""
        # AWS Bedrock integration would go here
        # This is a placeholder for future implementation
        raise NotImplementedError("AWS Bedrock integration not yet implemented")

    async def close(self) -> None:
        """Close the HTTP client."""
        await self.client.aclose()


# Global LLM service instance
_llm_service: Optional[LLMService] = None


def get_llm_service() -> Optional[LLMService]:
    """Get or create the global LLM service instance."""
    global _llm_service
    if _llm_service is None:
        provider = os.getenv("LLM_PROVIDER", "openai")
        api_key = os.getenv("OPENAI_API_KEY") or os.getenv("ANTHROPIC_API_KEY")
        model = os.getenv("LLM_MODEL", "gpt-4o-mini")

        if api_key:
            _llm_service = LLMService(provider=provider, api_key=api_key, model=model)
    return _llm_service

