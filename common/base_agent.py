"""
Base Agent Framework - Common functionality for all agents.
Reduces duplication by providing shared base implementation.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Type
from dataclasses import dataclass
import logging
from datetime import datetime


@dataclass
class AgentConfig:
    """Base configuration for all agents"""
    name: str
    version: str = "1.0.0"
    description: str = ""
    max_retries: int = 3
    timeout: int = 300
    log_level: str = "INFO"
    

class BaseAgent(ABC):
    """
    Abstract base class for all agents in the system.
    Provides common functionality to reduce code duplication.
    """
    
    def __init__(self, config: AgentConfig):
        self.config = config
        self.logger = self._setup_logger()
        self.start_time = datetime.now()
        self.metrics = {
            "requests_processed": 0,
            "errors": 0,
            "success_rate": 0.0
        }
        
    def _setup_logger(self) -> logging.Logger:
        """Configure logging for the agent"""
        logger = logging.getLogger(self.config.name)
        logger.setLevel(getattr(logging, self.config.log_level))
        
        if not logger.handlers:
            handler = logging.StreamHandler()
            formatter = logging.Formatter(
                f'[%(asctime)s] [{self.config.name}] %(levelname)s: %(message)s'
            )
            handler.setFormatter(formatter)
            logger.addHandler(handler)
            
        return logger
    
    @abstractmethod
    async def process(self, input_data: Any) -> Any:
        """Main processing method - must be implemented by subclasses"""
        pass
    
    async def execute(self, input_data: Any) -> Dict[str, Any]:
        """
        Execute agent processing with error handling and metrics.
        This is the main entry point for all agents.
        """
        try:
            self.logger.info(f"Processing request: {type(input_data)}")
            self.metrics["requests_processed"] += 1
            
            # Validate input
            if not self._validate_input(input_data):
                raise ValueError("Invalid input data")
            
            # Process with retry logic
            result = await self._execute_with_retry(input_data)
            
            # Update metrics
            self._update_success_metrics()
            
            return {
                "success": True,
                "result": result,
                "agent": self.config.name,
                "version": self.config.version,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error processing request: {str(e)}")
            self.metrics["errors"] += 1
            self._update_success_metrics()
            
            return {
                "success": False,
                "error": str(e),
                "agent": self.config.name,
                "version": self.config.version,
                "timestamp": datetime.now().isoformat()
            }
    
    async def _execute_with_retry(self, input_data: Any) -> Any:
        """Execute with retry logic"""
        last_error = None
        
        for attempt in range(self.config.max_retries):
            try:
                return await self.process(input_data)
            except Exception as e:
                last_error = e
                self.logger.warning(
                    f"Attempt {attempt + 1}/{self.config.max_retries} failed: {str(e)}"
                )
                if attempt < self.config.max_retries - 1:
                    await self._wait_before_retry(attempt)
                    
        raise last_error
    
    def _validate_input(self, input_data: Any) -> bool:
        """Base validation - override in subclasses for specific validation"""
        return input_data is not None
    
    async def _wait_before_retry(self, attempt: int):
        """Exponential backoff for retries"""
        import asyncio
        wait_time = 2 ** attempt  # 1, 2, 4 seconds
        await asyncio.sleep(wait_time)
    
    def _update_success_metrics(self):
        """Update success rate metric"""
        total = self.metrics["requests_processed"]
        if total > 0:
            success = total - self.metrics["errors"]
            self.metrics["success_rate"] = (success / total) * 100
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current agent metrics"""
        uptime = (datetime.now() - self.start_time).total_seconds()
        return {
            **self.metrics,
            "uptime_seconds": uptime,
            "agent_name": self.config.name,
            "agent_version": self.config.version
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Health check endpoint for monitoring"""
        return {
            "status": "healthy",
            "agent": self.config.name,
            "version": self.config.version,
            "metrics": self.get_metrics()
        }