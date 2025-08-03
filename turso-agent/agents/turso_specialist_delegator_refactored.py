"""
Turso Specialist Delegator - Refactored Version
This is a thin wrapper that imports from the refactored modules.
The original 706-line file has been split into smaller, focused modules.
"""

from delegator import TursoSpecialistDelegator, DelegatorConfig

# For backward compatibility, export the main class
__all__ = ['TursoSpecialistDelegator', 'DelegatorConfig']

# Usage example:
if __name__ == "__main__":
    import asyncio
    
    async def test_delegator():
        # Create delegator instance
        delegator = TursoSpecialistDelegator()
        
        # Get status
        status = delegator.get_status()
        print("Agent Status:", status)
        
        # Process a sample request
        response = await delegator.process_request("How do I optimize slow queries?")
        print("\nResponse:", response)
        
        # Get help
        help_text = delegator.get_help()
        print("\nHelp:", help_text)
    
    # Run test
    asyncio.run(test_delegator())