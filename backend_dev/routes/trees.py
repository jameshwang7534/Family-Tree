from fastapi import APIRouter, HTTPException, Depends
from routes.auth import get_current_user_id
from schemas import TreeCreate, TreeResponse
from models import TreeModel

router = APIRouter()

DEFAULT_TREE_ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23667eea'%3E%3Cpath d='M12 2C8 2 6 5 6 8c0 2 1 3 2 4H4v2h3l-1 6h3v-4h4v4h3l-1-6h3v-2h-4c1-1 2-2 2-4 0-3-2-6-6-6z'/%3E%3C/svg%3E"


def tree_to_response(tree) -> TreeResponse:
    return TreeResponse(
        id=tree.id,
        userId=tree.user_id,
        name=tree.name,
        description=tree.description,
        iconUrl=tree.icon_url or DEFAULT_TREE_ICON,
        createdAt=tree.created_at.isoformat(),
        updatedAt=tree.updated_at.isoformat(),
    )


@router.get("", response_model=list[TreeResponse])
async def list_my_trees(user_id: str = Depends(get_current_user_id)):
    """List all trees owned by the current user."""
    trees = TreeModel.find_by_user_id(user_id)
    return [tree_to_response(t) for t in trees]


@router.post("", response_model=TreeResponse)
async def create_tree(
    payload: TreeCreate,
    user_id: str = Depends(get_current_user_id),
):
    """Create a new tree for the current user."""
    if not payload.name or not payload.name.strip():
        raise HTTPException(status_code=400, detail="Name is required")
    icon_url = (payload.icon_url and payload.icon_url.strip()) or DEFAULT_TREE_ICON
    tree = TreeModel.create(
        user_id=user_id,
        name=payload.name.strip(),
        description=payload.description.strip() if payload.description else None,
        icon_url=icon_url,
    )
    return tree_to_response(tree)


@router.get("/{tree_id}", response_model=TreeResponse)
async def get_tree(
    tree_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get a tree by id (must be owned by current user)."""
    tree = TreeModel.find_by_id(tree_id)
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    if tree.user_id != user_id:
        raise HTTPException(status_code=404, detail="Tree not found")
    return tree_to_response(tree)
