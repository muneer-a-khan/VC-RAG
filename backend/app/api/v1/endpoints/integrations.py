"""
Third-party integrations endpoints
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.models.user import User
from app.db.database import get_db

router = APIRouter()


class IntegrationResponse(BaseModel):
    """Integration information"""
    name: str
    display_name: str
    connected: bool
    status: Optional[str] = None
    last_sync: Optional[str] = None


class OAuthUrlResponse(BaseModel):
    """OAuth URL response"""
    auth_url: str
    state: str


@router.get("", response_model=List[IntegrationResponse])
async def list_integrations(
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """List all available and connected integrations"""
    # Get user's connected integrations
    user_integrations = await db.integration.find_many(
        where={"userId": current_user.id}
    )
    
    # Map connected integrations by name
    connected_map = {integ.name: integ for integ in user_integrations}
    
    # Define available integrations
    available_integrations = [
        {
            "name": "google_workspace",
            "display_name": "Google Workspace",
        },
        {
            "name": "hubspot",
            "display_name": "HubSpot CRM",
        },
        {
            "name": "angellist",
            "display_name": "AngelList",
        },
        {
            "name": "pitchbook",
            "display_name": "PitchBook",
        }
    ]
    
    # Build response
    result = []
    for integ in available_integrations:
        connected_integ = connected_map.get(integ["name"])
        result.append(IntegrationResponse(
            name=integ["name"],
            display_name=integ["display_name"],
            connected=connected_integ is not None,
            status=connected_integ.status if connected_integ else None,
            last_sync=connected_integ.lastSync.isoformat() if connected_integ and connected_integ.lastSync else None
        ))
    
    return result


@router.get("/{tool_name}/auth-url", response_model=OAuthUrlResponse)
async def get_auth_url(
    tool_name: str,
    current_user: User = Depends(get_current_user)
):
    """Start OAuth flow for integration"""
    # TODO: Generate OAuth URL based on integration type
    if tool_name not in ["google_workspace", "hubspot", "angellist"]:
        raise HTTPException(status_code=400, detail="Unknown integration")
    
    return OAuthUrlResponse(
        auth_url=f"https://oauth.example.com/{tool_name}",
        state="random-state-token"
    )


@router.post("/{tool_name}/callback")
async def oauth_callback(
    tool_name: str,
    code: str,
    state: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Complete OAuth connection"""
    # TODO: Exchange code for access token, store credentials
    
    # Create or update integration
    integration = await db.integration.upsert(
        where={
            "userId_name": {
                "userId": current_user.id,
                "name": tool_name
            }
        },
        data={
            "create": {
                "userId": current_user.id,
                "name": tool_name,
                "displayName": tool_name.replace("_", " ").title(),
                "status": "connected",
                "credentials": {}  # Store encrypted credentials
            },
            "update": {
                "status": "connected",
                "credentials": {}
            }
        }
    )
    
    return {
        "status": "connected",
        "integration": tool_name
    }


@router.post("/sync/{integration_id}")
async def trigger_sync(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Manually trigger data sync for an integration"""
    # Verify integration ownership
    integration = await db.integration.find_first(
        where={
            "id": integration_id,
            "userId": current_user.id
        }
    )
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # TODO: Start background task to sync data
    await db.integration.update(
        where={"id": integration_id},
        data={"syncStatus": "syncing"}
    )
    
    return {
        "status": "sync_started",
        "integration_id": integration_id
    }


@router.delete("/{integration_id}")
async def disconnect_integration(
    integration_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_db)
):
    """Disconnect an integration"""
    # Verify integration ownership
    integration = await db.integration.find_first(
        where={
            "id": integration_id,
            "userId": current_user.id
        }
    )
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # Delete integration
    await db.integration.delete(where={"id": integration_id})
    
    return {
        "status": "disconnected",
        "integration_id": integration_id
    }
