import { useState } from "react";
import "./App.css";
import axios from "axios";

function App() {

  const [customerName, setCustomerName] = useState("");
  const [question, setQuestion] = useState("");

  const [response, setResponse] = useState<any>(null);

  const [tickets, setTickets] = useState<any[]>([]);

  const [chatHistory, setChatHistory] = useState<any[]>([]);

  const [activePage, setActivePage] = useState("dashboard");

  const [documents, setDocuments] = useState<any[]>([]);

  const [docTitle, setDocTitle] = useState("");

  const [docContent, setDocContent] = useState("");

  const [searchTerm, setSearchTerm] = useState("");

  const [statusFilter, setStatusFilter] = useState("All");

  const sendMessage = async () => {

    try {

      const res = await axios.post(
        "http://127.0.0.1:8000/chat",
        {
          customer_name: customerName,
          question: question
        }
      );

      setResponse(res.data);

    } catch (error) {
      console.error(error);
    }
  };

const fetchTickets = async () => {

  try {

    const res = await axios.get(
      "http://127.0.0.1:8000/tickets"
    );

    setTickets(res.data);

  } catch (error) {
    console.error(error);
  }
};

const updateTicketStatus = async (
  ticketId: number,
  status: string
) => {

  try {

    await axios.put(
      `http://127.0.0.1:8000/tickets/${ticketId}`,
      {
        status: status
      }
    );

    fetchTickets();

  } catch (error) {
    console.error(error);
  }
};

const fetchChatHistory = async () => {
  try {
    const res = await axios.get("http://127.0.0.1:8000/chat-history");
    setChatHistory(res.data);
  } catch (error) {
    console.error(error);
  }
};
const fetchDocuments = async () => {
  try {
    const res = await axios.get("http://127.0.0.1:8000/documents");
    setDocuments(res.data);
  } catch (error) {
    console.error(error);
  }
};

const addDocument = async () => {
  try {
    await axios.post("http://127.0.0.1:8000/documents", {
      title: docTitle,
      content: docContent
    });

    setDocTitle("");
    setDocContent("");
    fetchDocuments();

  } catch (error) {
    console.error(error);
  }
};
const deleteDocument = async (documentId: number) => {
  try {
    await axios.delete(`http://127.0.0.1:8000/documents/${documentId}`);
    fetchDocuments();
  } catch (error) {
    console.error(error);
  }
};

const filteredTickets = tickets.filter((ticket) => {
  const matchesSearch =
    ticket.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.category.toLowerCase().includes(searchTerm.toLowerCase());

  const matchesStatus =
    statusFilter === "All" || ticket.status === statusFilter;

  return matchesSearch && matchesStatus;
});
const totalTickets = tickets.length;
const openTickets = tickets.filter((t) => t.status === "Open").length;
const resolvedTickets = tickets.filter((t) => t.status === "Resolved").length;
const highPriorityTickets = tickets.filter((t) => t.priority === "High").length;

  return (
  <div className="layout">
    <div className="sidebar">

  <h2>AI Support Agent</h2>

  <p onClick={() => setActivePage("dashboard")}>
  Dashboard
</p>
<p onClick={() => setActivePage("tickets")}>
  Support Tickets
</p>
<p onClick={() => setActivePage("history")}>
  Chat History
</p>
<p onClick={() => setActivePage("knowledge")}>
  Knowledge Base
</p>

  <p>Analytics</p>

</div>

<div className="main-content">
    <div className="card">

      <div className="stats-grid">
  <div className="stat-card">
    <h3>Total Tickets</h3>
    <p>{totalTickets}</p>
  </div>

  <div className="stat-card">
    <h3>Open Tickets</h3>
    <p>{openTickets}</p>
  </div>

  <div className="stat-card">
    <h3>Resolved</h3>
    <p>{resolvedTickets}</p>
  </div>

  <div className="stat-card">
    <h3>High Priority</h3>
    <p>{highPriorityTickets}</p>
  </div>
</div>
      <h1>AI Customer Support Agent</h1>
      <p>
        Enter a customer issue and the AI agent will classify it,
        generate a response, assign priority, and create a support ticket if needed.
      </p>

      <input
        type="text"
        placeholder="Customer Name"
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
      />

      <textarea
        placeholder="Describe the customer issue..."
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        rows={5}
      />

      <button onClick={sendMessage}>Generate AI Response</button>

      <button onClick={fetchChatHistory}
        style={{ marginLeft: "10px" }}
      >
        Load Chat History
      </button>

      <button
        onClick={fetchTickets}
        style={{ marginLeft: "10px" }}
      >
      Load Tickets
    </button>

      {activePage === "dashboard" && response && (
        <div className="response-card">
          <h2>AI Response</h2>

          <p>{response.ai_response}</p>

          <span className="badge">Category: {response.category}</span>
          <span className="badge">Priority: {response.priority}</span>
          <span className="badge">
            Ticket: {response.ticket_created ? "Created" : "Not Created"}
          </span>

          {response.ticket_id && (
            <p>
              <strong>Ticket ID:</strong> {response.ticket_id}
            </p>
          )}

          <p>
            <strong>Ticket Summary:</strong>
            <br />
            {response.ticket_summary}
          </p>
        </div>
      )}
        {activePage === "tickets" && tickets.length > 0 && (
        <div className="response-card">
          <h2>Support Tickets Dashboard</h2>


      <input
  type="text"
  placeholder="Search tickets..."
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
/>

<select
  value={statusFilter}
  onChange={(e) => setStatusFilter(e.target.value)}
>
  <option value="All">All Status</option>
  <option value="Open">Open</option>
  <option value="In Progress">In Progress</option>
  <option value="Resolved">Resolved</option>
</select>

      {filteredTickets.map((ticket) => (
        <div key={ticket.id}>
              <p><strong>Customer:</strong> {ticket.customer_name}</p>
              <p><strong>Issue:</strong> {ticket.issue}</p>
              <p><strong>Status:</strong> {ticket.status}</p>
              <p><strong>Priority:</strong> {ticket.priority}</p>
              <p><strong>Category:</strong> {ticket.category}</p>

              <button
                onClick={() =>
                  updateTicketStatus(ticket.id, "In Progress")
                }
              >
                  Mark In Progress
              </button>

              <button
                onClick={() =>
                  updateTicketStatus(ticket.id, "Resolved")
                }
                style={{ marginLeft: "10px" }}
              >
                Mark Resolved
              </button>
              <hr />
            </div>
          ))}
        </div>
      )} 
    {activePage === "history" && chatHistory.length > 0 && (
  <div className="response-card">
    <h2>Chat History</h2>

    {chatHistory.map((chat) => (
      <div key={chat.id}>
        <p><strong>Customer Question:</strong> {chat.user_question}</p>
        <p><strong>AI Response:</strong> {chat.ai_response}</p>
        <hr />
      </div>
    ))}
  </div>
)}   
{activePage === "knowledge" && (
  <div className="response-card">
    <h2>Knowledge Base</h2>

    <input
      type="text"
      placeholder="Document Title"
      value={docTitle}
      onChange={(e) => setDocTitle(e.target.value)}
    />

    <textarea
      placeholder="Document Content"
      value={docContent}
      onChange={(e) => setDocContent(e.target.value)}
      rows={4}
    />

    <button onClick={addDocument}>Add Document</button>

    <button onClick={fetchDocuments} style={{ marginLeft: "10px" }}>
      Load Documents
    </button>

    {documents.map((doc) => (
  <div key={doc.id}>
    <h3>{doc.title}</h3>
    <p>{doc.content}</p>

    <button onClick={() => deleteDocument(doc.id)}>
      Delete
    </button>

    <hr />
  </div>
))}
  </div>
)}
    </div>
  </div>
  </div>
);
}

export default App;