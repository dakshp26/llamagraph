from pydantic import BaseModel, ConfigDict, Field


class NodeModel(BaseModel):
    id: str
    type: str
    data: dict = Field(default_factory=dict)


class EdgeModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    source: str
    target: str
    source_handle: str | None = Field(default=None, alias="sourceHandle")
    target_handle: str | None = Field(default=None, alias="targetHandle")


class GraphPayload(BaseModel):
    nodes: list[NodeModel]
    edges: list[EdgeModel]


class ValidationErrorItem(BaseModel):
    node_id: str | None = None
    message: str


class ValidateResponse(BaseModel):
    valid: bool
    errors: list[ValidationErrorItem]
