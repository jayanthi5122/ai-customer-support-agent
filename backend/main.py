import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

print(os.getenv("OPENAI_API_KEY"))

client = OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from models import ChatHistory, Ticket, Document
from schemas import ChatRequest, TicketCreate, TicketResponse, DocumentCreate, DocumentResponse, TicketUpdate


app = FastAPI(title="AI Customer Support Agent API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def generate_ai_response(question: str, documents: list):

    question_lower = question.lower()

    matched_document = None

    for document in documents:

        if "refund" in question_lower and "refund" in document.content.lower():
            matched_document = document

        elif "delivery" in question_lower and "delivery" in document.content.lower():
            matched_document = document

        elif "password" in question_lower and "password" in document.content.lower():
            matched_document = document

    if matched_document:

        ai_message = f"""
        Based on our company policy:

        {matched_document.content}
        """

    else:

        ai_message = f"""
        Support Response:

        We have received your issue regarding:
        '{question}'

        Our support team will review this and assist you shortly.
        """

    ticket_summary = f"""
    Customer reported issue:
    {question}
    """

    priority = "Medium"

    if any(
        word in question_lower
        for word in ["angry", "urgent", "immediately", "damaged"]
    ):
        priority = "High"

    if any(
        word in question_lower
        for word in ["lawsuit", "legal", "fraud", "security breach"]
    ):
        priority = "Critical"

    should_create_ticket = any(
        word in question_lower
        for word in [
            "refund",
            "delivery",
            "issue",
            "problem",
            "damaged",
            "angry",
            "urgent",
            "complaint"
        ]
    )

    category = "General"

    if "refund" in question_lower:
        category = "Refund"

    elif "delivery" in question_lower:
        category = "Delivery Issue"

    elif "password" in question_lower:
        category = "Login Issue"

    return (
        ai_message,
        category,
        should_create_ticket,
        ticket_summary,
        priority
    )


@app.get("/")
def home():
    return {
        "message": "AI Customer Support Agent Backend Running"
    }


@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    
    documents = db.query(Document).all()

    ai_response, category, should_create_ticket, ticket_summary, priority  = generate_ai_response(
        request.question,
        documents
    )

    chat_record = ChatHistory(
        user_question=request.question,
        ai_response=ai_response
    )

    db.add(chat_record)

    ticket_id = None

    if should_create_ticket:

        ticket = Ticket(
            customer_name=request.customer_name,
            issue=request.question,
            category=category,
            priority=priority
        )

        db.add(ticket)
        db.commit()
        db.refresh(ticket)

        ticket_id = ticket.id

    else:
        db.commit()

    return {
        "customer_name": request.customer_name,
        "question": request.question,
        "ai_response": ai_response,
        "category": category,
        "ticket_created": should_create_ticket,
        "ticket_summary": ticket_summary,
        "priority": priority,
        "ticket_id": ticket_id
    }


@app.get("/tickets", response_model=list[TicketResponse])
def get_tickets(db: Session = Depends(get_db)):
    return db.query(Ticket).all()


@app.post("/tickets", response_model=TicketResponse)
def create_ticket(ticket_data: TicketCreate, db: Session = Depends(get_db)):

    ticket = Ticket(**ticket_data.dict())

    db.add(ticket)
    db.commit()
    db.refresh(ticket)

    return ticket


@app.get("/chat-history")
def get_chat_history(db: Session = Depends(get_db)):
    return db.query(ChatHistory).all()
@app.post("/documents", response_model=DocumentResponse)
def create_document(document_data: DocumentCreate, db: Session = Depends(get_db)):

    document = Document(
        title=document_data.title,
        content=document_data.content
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return document


@app.get("/documents", response_model=list[DocumentResponse])
def get_documents(db: Session = Depends(get_db)):
    return db.query(Document).all()


@app.put("/tickets/{ticket_id}", response_model=TicketResponse)
def update_ticket_status(
    ticket_id: int,
    ticket_update: TicketUpdate,
    db: Session = Depends(get_db)
):
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()

    if ticket is None:
        return {"error": "Ticket not found"}

    ticket.status = ticket_update.status

    db.commit()
    db.refresh(ticket)

    return ticket