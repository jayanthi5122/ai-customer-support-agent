import { useState } from "react";
import axios from "axios";
import "./App.css";

const API_URL = "http://127.0.0.1:8000";

function App() {
  const [activePage, setActivePage] = useState("dashboard");

  const [customerName, setCustomerName] = useState("");
  const [question, setQuestion] = useState("");
  const [response, setResponse] = useState<any>(null);

  const [tickets, setTickets] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  const [docTitle, setDocTitle] = useState("");
  const [docContent, setDocContent] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendMessage = async () => {
    if (!customerName || !question) {
      setError("Please enter customer name and issue.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const res = await axios.post(`${API_URL}/chat`, {
        customer_name: customerName,
        question: question,
      });

      setResponse(res.data);
      setActivePage("dashboard");

      setCustomerName("");
      setQuestion("");
    } catch {
      setError("Unable to connect to backend. Make sure FastAPI is running.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const res = await axios.get(`${API_URL}/tickets`);
      setTickets(res.data);
      setActivePage("tickets");
    } catch {
      setError("Unable to load tickets.");
    }
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/chat-history`);
      setChatHistory(res.data);
      setActivePage("history");
    } catch {
      setError("Unable to load chat history.");
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await axios.get(`${API_URL}/documents`);
      setDocuments(res.data);
      setActivePage("knowledge");
    } catch {
      setError("Unable to load documents.");
    }
  };

  const addDocument = async () => {
    if (!docTitle || !docContent) {
      setError("Please enter document title and content.");
      return;
    }

    try {
      await axios.post(`${API_URL}/documents`, {
        title: docTitle,
        content: docContent,
      });

      setDocTitle("");
      setDocContent("");
      fetchDocuments();
    } catch {
      setError("Unable to add document.");
    }
  };

  const deleteDocument = async (documentId: number) => {
    try {
      await axios.delete(`${API_URL}/documents/${documentId}`);
      fetchDocuments();
    } catch {
      setError("Unable to delete document.");
    }
  };

  const updateTicketStatus = async (ticketId: number, status: string) => {
    try {
      await axios.put(`${API_URL}/tickets/${ticketId}`, {
        status: status,
      });

      fetchTickets();
    } catch {
      setError("Unable to update ticket.");
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      ticket.customer_name.toLowerCase().includes(search) ||
      ticket.issue.toLowerCase().includes(search) ||
      ticket.category.toLowerCase().includes(search);

    const matchesStatus =
      statusFilter === "All" || ticket.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t) => t.status === "Open").length;
  const resolvedTickets = tickets.filter((t) => t.status === "Resolved").length;
  const highPriorityTickets = tickets.filter((t) => t.priority === "High").length;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <h2>AI Support</h2>
        <p>Customer Support Platform</p>

        <button onClick={() => setActivePage("dashboard")}>Dashboard</button>
        <button onClick={fetchTickets}>Tickets</button>
        <button onClick={fetchChatHistory}>Chat History</button>
        <button onClick={fetchDocuments}>Knowledge Base</button>
      </aside>

      <main className="main">
        <div className="topbar">
          <div>
            <h1>AI Customer Support Agent</h1>
            <p>Automate support replies, ticket creation, and knowledge-based assistance.</p>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Tickets</span>
            <h2>{totalTickets}</h2>
          </div>

          <div className="stat-card">
            <span>Open Tickets</span>
            <h2>{openTickets}</h2>
          </div>

          <div className="stat-card">
            <span>Resolved</span>
            <h2>{resolvedTickets}</h2>
          </div>

          <div className="stat-card">
            <span>High Priority</span>
            <h2>{highPriorityTickets}</h2>
          </div>
        </section>

        {activePage === "dashboard" && (
          <section className="content-grid">
            <div className="panel">
              <h2>Ask the Support Agent</h2>
              <p className="muted">Enter a customer issue and the system will classify it.</p>

              <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />

              <textarea
                placeholder="Example: My order arrived damaged and I need a refund immediately."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={6}
              />

              <button className="primary-btn" onClick={sendMessage}>
                {loading ? "Generating..." : "Generate AI Response"}
              </button>
            </div>

            <div className="panel">
              <h2>AI Response</h2>

              {!response ? (
                <p className="empty-text">No response generated yet.</p>
              ) : (
                <>
                  <p>{response.ai_response}</p>

                  <div className="badge-row">
                    <span className="badge">Category: {response.category}</span>
                    <span className="badge">Priority: {response.priority}</span>
                    <span className="badge">
                      Ticket: {response.ticket_created ? "Created" : "Not Created"}
                    </span>
                  </div>

                  {response.ticket_id && (
                    <p>
                      <strong>Ticket ID:</strong> #{response.ticket_id}
                    </p>
                  )}

                  <p>
                    <strong>Summary:</strong>
                    <br />
                    {response.ticket_summary}
                  </p>
                </>
              )}
            </div>
          </section>
        )}

        {activePage === "tickets" && (
          <section className="panel">
            <h2>Support Tickets</h2>

            <div className="filter-row">
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
            </div>

            {filteredTickets.length === 0 ? (
              <p className="empty-text">No tickets found. Click Tickets after creating a support request.</p>
            ) : (
              <div className="ticket-list">
                {filteredTickets.map((ticket) => (
                  <div className="ticket-card" key={ticket.id}>
                    <div>
                      <h3>#{ticket.id} - {ticket.customer_name}</h3>
                      <p>{ticket.issue}</p>
                    </div>

                    <div className="badge-row">
                      <span className="badge">{ticket.category}</span>
                      <span className="badge">{ticket.priority}</span>
                      <span className="badge">{ticket.status}</span>
                    </div>

                    <div className="action-row">
                      <button onClick={() => updateTicketStatus(ticket.id, "In Progress")}>
                        Mark In Progress
                      </button>
                      <button onClick={() => updateTicketStatus(ticket.id, "Resolved")}>
                        Mark Resolved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === "history" && (
          <section className="panel">
            <h2>Chat History</h2>

            {chatHistory.length === 0 ? (
              <p className="empty-text">No chat history loaded.</p>
            ) : (
              chatHistory.map((chat) => (
                <div className="history-card" key={chat.id}>
                  <p><strong>Customer:</strong> {chat.user_question}</p>
                  <p><strong>AI:</strong> {chat.ai_response}</p>
                </div>
              ))
            )}
          </section>
        )}

        {activePage === "knowledge" && (
          <section className="content-grid">
            <div className="panel">
              <h2>Add Knowledge Document</h2>

              <input
                type="text"
                placeholder="Document title"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
              />

              <textarea
                placeholder="Document content"
                value={docContent}
                onChange={(e) => setDocContent(e.target.value)}
                rows={6}
              />

              <button className="primary-btn" onClick={addDocument}>
                Add Document
              </button>
            </div>

            <div className="panel">
              <h2>Knowledge Base</h2>

              {documents.length === 0 ? (
                <p className="empty-text">No documents added yet.</p>
              ) : (
                documents.map((doc) => (
                  <div className="document-card" key={doc.id}>
                    <h3>{doc.title}</h3>
                    <p>{doc.content}</p>
                    <button onClick={() => deleteDocument(doc.id)}>Delete</button>
                  </div>
                ))
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;