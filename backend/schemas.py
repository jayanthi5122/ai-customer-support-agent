from pydantic import BaseModel


class ChatRequest(BaseModel):
    customer_name: str
    question: str


class TicketCreate(BaseModel):
    customer_name: str
    issue: str
    category: str = "General"
    priority: str = "Medium"


class TicketResponse(BaseModel):
    id: int
    customer_name: str
    issue: str
    category: str
    priority: str
    status: str

class Config:
    from_attributes = True
        
class DocumentCreate(BaseModel):
    title: str
    content: str


class DocumentResponse(BaseModel):
    id: int
    title: str
    content: str

    class Config:
        from_attributes = True


class TicketUpdate(BaseModel):
    status: str