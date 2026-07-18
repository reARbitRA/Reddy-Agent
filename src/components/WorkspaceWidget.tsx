import React, { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, 
  Mail, 
  FileText, 
  Plus, 
  Send, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  Search, 
  LogOut, 
  Trash2, 
  Layers, 
  FolderOpen 
} from 'lucide-react';
import { googleSignIn, initAuth, logout, getAccessToken } from '../lib/firebase';
import { User } from 'firebase/auth';

interface GmailMessage {
  id: string;
  snippet: string;
  subject?: string;
  from?: string;
}

interface SheetData {
  id: string;
  title: string;
  spreadsheetUrl: string;
}

interface DocData {
  id: string;
  title: string;
}

export const WorkspaceWidget: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sheets' | 'gmail' | 'docs'>('sheets');
  const [logs, setLogs] = useState<{ msg: string; type: 'info' | 'success' | 'error' }[]>([]);

  // Sheets state
  const [sheetsList, setSheetsList] = useState<SheetData[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string>('');
  const [newSheetTitle, setNewSheetTitle] = useState('Workspace Database');
  const [sheetRowData, setSheetRowData] = useState({ col1: '', col2: '', col3: '' });
  const [sheetRows, setSheetRows] = useState<string[][]>([]);

  // Gmail state
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [gmailForm, setGmailForm] = useState({ to: '', subject: '', body: '' });

  // Docs state
  const [docsList, setDocsList] = useState<DocData[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [newDocTitle, setNewDocTitle] = useState('Workspace Master Plan');
  const [docContent, setDocContent] = useState('');
  const [newDocText, setNewDocText] = useState('');

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ msg: `[${new Date().toLocaleTimeString()}] ${msg}`, type }, ...prev.slice(0, 30)]);
  };

  useEffect(() => {
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        addLog('Google Workspace Auth initialized.', 'success');
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
        addLog('Workspace Authentication required.', 'info');
      }
    );
  }, []);

  useEffect(() => {
    if (token) {
      loadInitialData();
    }
  }, [token]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchSheets(),
        fetchEmails(),
        fetchDocs()
      ]);
      addLog('All Google Workspace data loaded.', 'success');
    } catch (e: any) {
      addLog(`Failed to load some data: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setNeedsAuth(false);
        addLog(`Logged in as ${res.user.email}`, 'success');
      }
    } catch (err: any) {
      addLog(`Login Failed: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const confirmLogout = window.confirm('Are you sure you want to log out from Google Workspace?');
    if (!confirmLogout) return;
    
    setIsLoading(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setSheetsList([]);
      setEmails([]);
      setDocsList([]);
      addLog('Successfully logged out.', 'info');
    } catch (err: any) {
      addLog(`Logout error: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------------- SHEETS API FUNCTIONS ----------------
  const fetchSheets = async () => {
    if (!token) return;
    try {
      // List spreadsheets from Drive API
      const res = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.spreadsheet%27', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.files) {
        const list = data.files.map((f: any) => ({
          id: f.id,
          title: f.name,
          spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${f.id}/edit`
        }));
        setSheetsList(list);
        if (list.length > 0 && !selectedSheetId) {
          setSelectedSheetId(list[0].id);
          fetchSheetRows(list[0].id);
        }
      }
    } catch (e: any) {
      addLog(`Error listing Sheets: ${e.message}`, 'error');
    }
  };

  const createSpreadsheet = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: { title: newSheetTitle }
        })
      });
      const data = await res.json();
      if (data.spreadsheetId) {
        addLog(`Spreadsheet "${newSheetTitle}" created successfully.`, 'success');
        setSelectedSheetId(data.spreadsheetId);
        
        // Quick format setup: Add a header row
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}/values/Sheet1!A1:C1:append?valueInputOption=USER_ENTERED`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: [['Timestamp', 'Category / Parameter', 'Log Entry Value']]
          })
        });

        fetchSheets();
        fetchSheetRows(data.spreadsheetId);
      }
    } catch (e: any) {
      addLog(`Failed to create spreadsheet: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSheetRows = async (id: string) => {
    if (!token || !id) return;
    try {
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/Sheet1!A1:Z50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setSheetRows(data.values || []);
    } catch (e: any) {
      addLog(`Error fetching spreadsheet rows: ${e.message}`, 'error');
    }
  };

  const addSheetRow = async () => {
    if (!token || !selectedSheetId) return;
    const confirmed = window.confirm('Append this row of logs to the chosen Google Spreadsheet?');
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const row = [
        new Date().toLocaleString(),
        sheetRowData.col1 || 'PARAMETER_LOG',
        sheetRowData.col2 || 'DATA_VALUE'
      ];
      const res = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${selectedSheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ values: [row] })
      });
      if (res.ok) {
        addLog('Row appended to Google Sheets successfully.', 'success');
        setSheetRowData({ col1: '', col2: '', col3: '' });
        fetchSheetRows(selectedSheetId);
      }
    } catch (e: any) {
      addLog(`Failed to append row: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // ---------------- GMAIL API FUNCTIONS ----------------
  const fetchEmails = async () => {
    if (!token) return;
    try {
      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=8', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.messages) {
        const detailedMsgs = await Promise.all(
          data.messages.map(async (msg: any) => {
            const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            const d = await detailRes.json();
            const subjectHeader = d.payload.headers.find((h: any) => h.name === 'Subject');
            const fromHeader = d.payload.headers.find((h: any) => h.name === 'From');
            return {
              id: d.id,
              snippet: d.snippet,
              subject: subjectHeader ? subjectHeader.value : '(No Subject)',
              from: fromHeader ? fromHeader.value : '(Unknown Sender)'
            };
          })
        );
        setEmails(detailedMsgs);
      } else {
        setEmails([]);
      }
    } catch (e: any) {
      addLog(`Error listing Gmail emails: ${e.message}`, 'error');
    }
  };

  const sendEmail = async () => {
    if (!token) return;
    const { to, subject, body } = gmailForm;
    if (!to || !subject || !body) {
      alert('Please fill out all email form fields.');
      return;
    }

    const confirmed = window.confirm(`Send an email to "${to}" on your behalf?`);
    if (!confirmed) return;

    setIsLoading(true);
    try {
      // Base64Url encode Gmail message format
      const emailContent = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        '',
        body
      ].join('\n');

      const encodedEmail = btoa(unescape(encodeURIComponent(emailContent)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ raw: encodedEmail })
      });

      if (res.ok) {
        addLog(`Email sent successfully to ${to}.`, 'success');
        setGmailForm({ to: '', subject: '', body: '' });
        fetchEmails();
      } else {
        const errData = await res.json();
        throw new Error(errData.error?.message || 'Send failed');
      }
    } catch (e: any) {
      addLog(`Failed to send email: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };


  // ---------------- DOCS API FUNCTIONS ----------------
  const fetchDocs = async () => {
    if (!token) return;
    try {
      // List docs from Drive API
      const res = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType%3D%27application%2Fvnd.google-apps.document%27', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.files) {
        const list = data.files.map((f: any) => ({
          id: f.id,
          title: f.name
        }));
        setDocsList(list);
        if (list.length > 0 && !selectedDocId) {
          setSelectedDocId(list[0].id);
          fetchDocContent(list[0].id);
        }
      }
    } catch (e: any) {
      addLog(`Error listing Docs: ${e.message}`, 'error');
    }
  };

  const fetchDocContent = async (id: string) => {
    if (!token || !id) return;
    try {
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      
      // Parse Document body structural components
      let parsedText = '';
      if (data.body && data.body.content) {
        data.body.content.forEach((el: any) => {
          if (el.paragraph && el.paragraph.elements) {
            el.paragraph.elements.forEach((subEl: any) => {
              if (subEl.textRun && subEl.textRun.content) {
                parsedText += subEl.textRun.content;
              }
            });
          }
        });
      }
      setDocContent(parsedText || '(Empty Document)');
    } catch (e: any) {
      addLog(`Error fetching Doc content: ${e.message}`, 'error');
    }
  };

  const createDocument = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await fetch('https://docs.googleapis.com/v1/documents', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title: newDocTitle })
      });
      const data = await res.json();
      if (data.documentId) {
        addLog(`Document "${newDocTitle}" created successfully.`, 'success');
        setSelectedDocId(data.documentId);
        fetchDocs();
        fetchDocContent(data.documentId);
      }
    } catch (e: any) {
      addLog(`Failed to create document: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const appendDocText = async () => {
    if (!token || !selectedDocId || !newDocText.trim()) return;
    const confirmed = window.confirm('Append your message to the end of this Google Doc?');
    if (!confirmed) return;

    setIsLoading(true);
    try {
      const res = await fetch(`https://docs.googleapis.com/v1/documents/${selectedDocId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                text: `\n[Log - ${new Date().toLocaleString()}]\n${newDocText}\n`,
                endOfSegmentLocation: {}
              }
            }
          ]
        })
      });

      if (res.ok) {
        addLog('Text appended to Google Doc successfully.', 'success');
        setNewDocText('');
        fetchDocContent(selectedDocId);
      } else {
        throw new Error('Doc Batch Update failed');
      }
    } catch (e: any) {
      addLog(`Failed to append text: ${e.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (needsAuth) {
    return (
      <div className="bg-[#18181b] border-4 border-black p-5 shadow-[4px_4px_0px_0px_#000] flex flex-col gap-4 text-zinc-300 select-none">
        <div className="flex items-center gap-2 border-b-2 border-black pb-2 text-[#facc15]">
          <Layers size={14} />
          <h3 className="font-sans font-black uppercase text-xs">Sovereign Google Workspace Integration</h3>
        </div>
        
        <p className="font-mono text-[11px] text-zinc-400 leading-relaxed">
          Unlock maximum capability by linking your workspace. This module communicates securely with Google Drive, sheets, Gmail inbox, and Google Docs databases directly using safe runtime memory caching.
        </p>

        <div className="bg-black/60 border border-zinc-850 p-3 font-mono text-[10px] text-zinc-550 space-y-1">
          <div className="text-red-400 font-extrabold uppercase">REQUIRED AUTHORIZATION SCOPES:</div>
          <div>▪ spreadsheets (Google Sheets API)</div>
          <div>▪ gmail.modify, gmail.send (Gmail API)</div>
          <div>▪ documents, drive.file (Google Docs & Drive API)</div>
        </div>

        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full py-3 bg-[#facc15] hover:bg-yellow-400 text-black font-mono font-black border-2 border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] active:translate-y-0.5 cursor-pointer text-xs uppercase flex items-center justify-center gap-2 transition-all"
        >
          {isLoading ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4.5 h-4.5">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
          )}
          LINK GOOGLE ACCOUNT
        </button>
      </div>
    );
  }

  return (
    <div className="bg-[#18181b] border-4 border-black p-4 shadow-[4px_4px_0px_0px_#000] flex flex-col gap-4 text-zinc-300">
      
      {/* Header with Linked Profile Info */}
      <div className="flex items-center justify-between border-b-2 border-black pb-2">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-[#facc15]" />
          <h3 className="font-sans font-black uppercase text-xs">GOOGLE WORKSPACE</h3>
        </div>
        <div className="flex items-center gap-2 text-[9px] font-mono">
          <span className="text-emerald-400 font-extrabold truncate max-w-[120px]" title={user?.email || ''}>
            {user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="p-1 px-1.5 bg-black text-red-400 border border-zinc-800 hover:bg-red-950/20 uppercase text-[8px] cursor-pointer"
            title="Disconnect Google Account"
          >
            <LogOut size={10} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 select-none">
        <button
          onClick={() => setActiveTab('sheets')}
          className={`py-1.5 text-[9px] font-black uppercase border-2 border-black flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'sheets' ? 'bg-[#facc15] text-black font-extrabold' : 'bg-black text-zinc-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet size={12} /> SHEETS
        </button>
        <button
          onClick={() => setActiveTab('gmail')}
          className={`py-1.5 text-[9px] font-black uppercase border-2 border-black flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'gmail' ? 'bg-[#facc15] text-black font-extrabold' : 'bg-black text-zinc-400 hover:text-white'
          }`}
        >
          <Mail size={12} /> GMAIL
        </button>
        <button
          onClick={() => setActiveTab('docs')}
          className={`py-1.5 text-[9px] font-black uppercase border-2 border-black flex items-center justify-center gap-1 cursor-pointer ${
            activeTab === 'docs' ? 'bg-[#facc15] text-black font-extrabold' : 'bg-black text-zinc-400 hover:text-white'
          }`}
        >
          <FileText size={12} /> DOCS
        </button>
      </div>

      {/* Main Tab Panels */}
      <div className="bg-black/40 border border-zinc-850 p-3 min-h-[220px] max-h-[350px] overflow-y-auto custom-scrollbar">
        
        {/* SHEETS PANEL */}
        {activeTab === 'sheets' && (
          <div className="space-y-3 font-mono text-[11px]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 uppercase font-black">Choose Active Spreadsheet</label>
              <div className="flex gap-2">
                <select
                  value={selectedSheetId}
                  onChange={(e) => {
                    setSelectedSheetId(e.target.value);
                    fetchSheetRows(e.target.value);
                  }}
                  className="flex-1 bg-black border border-zinc-800 p-1 text-xs text-zinc-300 outline-none"
                >
                  {sheetsList.length === 0 ? (
                    <option value="">(No Spreadsheets Found)</option>
                  ) : (
                    sheetsList.map((s) => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))
                  )}
                </select>
                <button
                  onClick={() => selectedSheetId && fetchSheetRows(selectedSheetId)}
                  className="p-1 bg-black text-cyan-400 border border-zinc-800 hover:bg-zinc-900 cursor-pointer"
                  title="Reload rows"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {/* Create Spreadsheet form */}
            <div className="border border-dashed border-zinc-850 p-2 space-y-2 bg-zinc-950/20">
              <span className="text-[8px] text-[#facc15] font-black uppercase tracking-wider block">Create Spreadsheet Database</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  className="flex-1 bg-black border border-zinc-800 px-1.5 py-0.5 text-[10px] outline-none"
                  placeholder="Spreadsheet Name"
                />
                <button
                  onClick={createSpreadsheet}
                  className="bg-[#facc15] text-black font-extrabold text-[8px] px-2.5 py-1 border border-black hover:bg-yellow-400 cursor-pointer uppercase flex items-center gap-1 shrink-0"
                >
                  <Plus size={10} /> CREATE
                </button>
              </div>
            </div>

            {/* Row Appender Form */}
            {selectedSheetId && (
              <div className="border border-dashed border-zinc-850 p-2 space-y-2 bg-zinc-950/20">
                <span className="text-[8px] text-[#facc15] font-black uppercase tracking-wider block">Append Row Data</span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={sheetRowData.col1}
                    onChange={(e) => setSheetRowData(prev => ({ ...prev, col1: e.target.value }))}
                    className="bg-black border border-zinc-800 px-1.5 py-0.5 text-[10px] outline-none"
                    placeholder="Category"
                  />
                  <input
                    type="text"
                    value={sheetRowData.col2}
                    onChange={(e) => setSheetRowData(prev => ({ ...prev, col2: e.target.value }))}
                    className="bg-black border border-zinc-800 px-1.5 py-0.5 text-[10px] outline-none"
                    placeholder="Log Entry"
                  />
                </div>
                <button
                  onClick={addSheetRow}
                  className="w-full bg-[#facc15] text-black font-extrabold text-[9px] py-1 border border-black hover:bg-yellow-400 cursor-pointer uppercase flex items-center justify-center gap-1"
                >
                  <Send size={10} /> APPEND TO SPREADSHEET
                </button>
              </div>
            )}

            {/* Spreadsheet Preview list of rows */}
            {selectedSheetId && (
              <div className="space-y-1">
                <span className="text-[8px] text-zinc-500 uppercase font-black block">Recent Spreadsheet Row Preview (Sheet1)</span>
                <div className="bg-zinc-950/60 border border-zinc-850 p-1.5 font-mono text-[9px] text-zinc-400 space-y-1 max-h-[120px] overflow-y-auto custom-scrollbar">
                  {sheetRows.length === 0 ? (
                    <div className="text-zinc-600 italic">Spreadsheet is empty or lacks rows.</div>
                  ) : (
                    sheetRows.slice(0, 10).map((row, idx) => (
                      <div key={idx} className="flex gap-2 border-b border-zinc-900 pb-0.5 font-mono leading-tight">
                        <span className="text-zinc-600 font-bold">{idx + 1}.</span>
                        <div className="flex-1 grid grid-cols-3 gap-1">
                          {row.map((cell, cIdx) => (
                            <span key={cIdx} className="truncate text-zinc-350" title={cell}>{cell}</span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* GMAIL PANEL */}
        {activeTab === 'gmail' && (
          <div className="space-y-3 font-mono text-[11px]">
            
            {/* Quick send email form */}
            <div className="border border-dashed border-zinc-850 p-2.5 space-y-2 bg-zinc-950/20">
              <span className="text-[8px] text-[#facc15] font-black uppercase tracking-wider block">Draft & Dispatch Email</span>
              <div className="space-y-1.5">
                <input
                  type="email"
                  value={gmailForm.to}
                  onChange={(e) => setGmailForm(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full bg-black border border-zinc-800 px-1.5 py-1 text-[10px] outline-none"
                  placeholder="Recipient Email"
                />
                <input
                  type="text"
                  value={gmailForm.subject}
                  onChange={(e) => setGmailForm(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full bg-black border border-zinc-800 px-1.5 py-1 text-[10px] outline-none"
                  placeholder="Subject Header"
                />
                <textarea
                  value={gmailForm.body}
                  onChange={(e) => setGmailForm(prev => ({ ...prev, body: e.target.value }))}
                  className="w-full h-16 bg-black border border-zinc-800 p-1.5 text-[10px] outline-none resize-none"
                  placeholder="Message Contents (HTML allowed)..."
                />
              </div>
              <button
                onClick={sendEmail}
                className="w-full bg-[#facc15] text-black font-extrabold text-[9px] py-1 border border-black hover:bg-yellow-400 cursor-pointer uppercase flex items-center justify-center gap-1"
              >
                <Send size={10} /> SEND EMAIL ON MY BEHALF
              </button>
            </div>

            {/* List emails */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[8px] text-zinc-500 uppercase font-black">
                <span>RECENT GMAIL MESSAGES</span>
                <button 
                  onClick={fetchEmails} 
                  className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <RefreshCw size={8} /> RELOAD
                </button>
              </div>

              <div className="space-y-1.5 max-h-[140px] overflow-y-auto custom-scrollbar">
                {emails.length === 0 ? (
                  <div className="text-zinc-600 italic p-1">No recent Gmail messages fetched.</div>
                ) : (
                  emails.map((m) => (
                    <div key={m.id} className="bg-zinc-950/40 border border-zinc-850 p-2 font-mono text-[9px] leading-tight space-y-0.5">
                      <div className="flex justify-between text-[8px] text-zinc-500">
                        <span className="font-black text-[#facc15] truncate max-w-[120px]">{m.from}</span>
                        <span>ID: {m.id.substring(0, 8)}</span>
                      </div>
                      <div className="text-zinc-300 font-bold truncate">{m.subject}</div>
                      <div className="text-zinc-500 text-[8px] line-clamp-1">{m.snippet}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* DOCS PANEL */}
        {activeTab === 'docs' && (
          <div className="space-y-3 font-mono text-[11px]">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] text-zinc-500 uppercase font-black">Select Active Document</label>
              <div className="flex gap-2">
                <select
                  value={selectedDocId}
                  onChange={(e) => {
                    setSelectedDocId(e.target.value);
                    fetchDocContent(e.target.value);
                  }}
                  className="flex-1 bg-black border border-zinc-800 p-1 text-xs text-zinc-300 outline-none"
                >
                  {docsList.length === 0 ? (
                    <option value="">(No Documents Found)</option>
                  ) : (
                    docsList.map((d) => (
                      <option key={d.id} value={d.id}>{d.title}</option>
                    ))
                  )}
                </select>
                <button
                  onClick={() => selectedDocId && fetchDocContent(selectedDocId)}
                  className="p-1 bg-black text-cyan-400 border border-zinc-800 hover:bg-zinc-900 cursor-pointer"
                  title="Reload document text"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>

            {/* Create document form */}
            <div className="border border-dashed border-zinc-850 p-2 space-y-2 bg-zinc-950/20">
              <span className="text-[8px] text-[#facc15] font-black uppercase tracking-wider block">Draft New Document</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDocTitle}
                  onChange={(e) => setNewDocTitle(e.target.value)}
                  className="flex-1 bg-black border border-zinc-800 px-1.5 py-0.5 text-[10px] outline-none"
                  placeholder="Document Title"
                />
                <button
                  onClick={createDocument}
                  className="bg-[#facc15] text-black font-extrabold text-[8px] px-2.5 py-1 border border-black hover:bg-yellow-400 cursor-pointer uppercase flex items-center gap-1 shrink-0"
                >
                  <Plus size={10} /> CREATE
                </button>
              </div>
            </div>

            {/* Append Text to current Doc form */}
            {selectedDocId && (
              <div className="border border-dashed border-zinc-850 p-2 space-y-2 bg-zinc-950/20">
                <span className="text-[8px] text-[#facc15] font-black uppercase tracking-wider block">Append Text block</span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newDocText}
                    onChange={(e) => setNewDocText(e.target.value)}
                    className="flex-1 bg-black border border-zinc-800 px-1.5 py-1 text-[10px] outline-none"
                    placeholder="Type notes or summaries..."
                  />
                  <button
                    onClick={appendDocText}
                    className="bg-[#facc15] text-black font-extrabold text-[8px] px-2.5 py-1 border border-black hover:bg-yellow-400 cursor-pointer uppercase flex items-center gap-1 shrink-0"
                  >
                    <Send size={10} /> APPEND
                  </button>
                </div>
              </div>
            )}

            {/* Document Content Preview */}
            {selectedDocId && (
              <div className="space-y-1">
                <span className="text-[8px] text-zinc-500 uppercase font-black block">Live Document Text Preview</span>
                <div className="bg-zinc-950/60 border border-zinc-850 p-2 font-mono text-[9px] text-zinc-400 select-text max-h-[120px] overflow-y-auto custom-scrollbar whitespace-pre-wrap leading-relaxed">
                  {docContent}
                </div>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Mini Workspace logs console output footer of the widget */}
      <div className="space-y-1 select-text">
        <span className="text-[8px] text-zinc-500 uppercase font-black block">WORKSPACE PROTOCOL REAL-TIME LOG</span>
        <div className="bg-black border-2 border-zinc-850 p-2 h-16 overflow-y-auto custom-scrollbar font-mono text-[8px] space-y-0.5">
          {logs.length === 0 ? (
            <div className="text-zinc-600 italic">No workspace actions logged yet. Connect to begin.</div>
          ) : (
            logs.map((lg, i) => (
              <div 
                key={i} 
                className={
                  lg.type === 'success' ? 'text-emerald-400' :
                  lg.type === 'error' ? 'text-red-500 font-extrabold' : 'text-zinc-400'
                }
              >
                {lg.msg}
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
};
