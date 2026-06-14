
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import Base, engine, SessionLocal
from models import ChatHistory, Ticket, Document
from schemas import ChatRequest, TicketCreate, TicketResponse, DocumentCreate, DocumentResponse, TicketUpdate

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Customer Support Agent API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
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

    agent = "Knowledge Base Agent"
    category = "General"
    sentiment = "Neutral"
    priority = "Medium"
    recommended_action = "Respond with standard support guidance."
    should_create_ticket = False

    positive_words = ["great", "amazing", "excellent", "delicious", "fresh", "love", "good"]
    negative_words = ["bad", "terrible", "cold", "late", "angry", "upset", "damaged", "missing", "wrong", "refund"]

    if any(word in question_lower for word in positive_words):
        sentiment = "Positive"

    if any(word in question_lower for word in negative_words):
        sentiment = "Negative"
        priority = "High"
        should_create_ticket = True
        recommended_action = "Create a support ticket and follow up with the customer."

    if any(word in question_lower for word in ["order", "delivery", "missing", "wrong", "cancel", "refund"]):
        agent = "Order Issue Agent"
        category = "Order Support"
        should_create_ticket = True

    elif any(word in question_lower for word in ["booking", "reservation", "table", "birthday", "group", "catering", "big order"]):
        agent = "Booking Agent"
        category = "Booking"
        should_create_ticket = True
        recommended_action = "Check availability and confirm booking details with the customer."

    elif any(word in question_lower for word in ["gift card", "voucher", "redeem", "balance"]):
        agent = "Gift Card Agent"
        category = "Gift Card"
        recommended_action = "Guide the customer with gift card purchase, redemption, or balance support."

    elif any(word in question_lower for word in ["review", "food", "taste", "service", "experience"]):
        agent = "Review Sentiment Agent"
        category = "Customer Review"
        recommended_action = "Analyse customer feedback and share insights with restaurant management."

    matched_document = None

    for document in documents:
        if document.title.lower() in question_lower or any(
            word in document.content.lower()
            for word in question_lower.split()
        ):
            matched_document = document
            break

    if matched_document:
        ai_message = f"""
Based on the restaurant knowledge base:

{matched_document.content}
"""
    else:
        if agent == "Order Issue Agent":
            ai_message = """
I understand you have an order-related issue. I have created a support ticket so the restaurant team can review your request and respond quickly.
"""
        elif agent == "Booking Agent":
            ai_message = """
I can help with bookings, table reservations, group dining, birthday bookings, or catering requests. Please share the preferred date, time, number of guests, and any special requirements.
"""
        elif agent == "Gift Card Agent":
            ai_message = """
I can help with gift card purchases, redemption, or balance-related questions. Please provide the gift card details or describe the issue.
"""
        elif agent == "Review Sentiment Agent":
            ai_message = """
Thank you for sharing your feedback. Your review has been analysed and recorded for the restaurant team.
"""
        else:
            ai_message = """
Thank you for contacting the restaurant support assistant. I can help with orders, bookings, gift cards, reviews, policies, and general restaurant questions.
"""

    if priority == "High" and any(word in question_lower for word in ["urgent", "immediately", "angry"]):
        priority = "Critical"
        recommended_action = "Escalate immediately to restaurant management."

    ticket_summary = f"""
Agent: {agent}
Customer issue: {question}
Sentiment: {sentiment}
Recommended action: {recommended_action}
"""

    return (
        ai_message,
        category,
        should_create_ticket,
        ticket_summary,
        priority,
        agent,
        sentiment,
        recommended_action
    )


@app.get("/")
def home():
    return {
        "message": "AI Customer Support Agent Backend Running"
    }


@app.post("/chat")
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    
    documents = db.query(Document).all()

    ai_response, category, should_create_ticket, ticket_summary, priority, agent, sentiment, recommended_action = generate_ai_response(
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
    "agent": agent,
    "sentiment": sentiment,
    "recommended_action": recommended_action,
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

@app.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_db)
):
    document = db.query(Document).filter(Document.id == document_id).first()

    if document is None:
        return {"error": "Document not found"}

    db.delete(document)
    db.commit()

    return {"message": "Document deleted successfully"}