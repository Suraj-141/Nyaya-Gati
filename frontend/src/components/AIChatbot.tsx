import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { useMockDb } from '../context/MockDbContext';
import { Case } from '../types';

interface Message {
  id: number;
  text: string;
  sender: 'bot' | 'user';
  timestamp: string;
}

const AIChatbot: React.FC = () => {
  const { cases, currentUser } = useMockDb();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: `Hello ${currentUser?.role || ''}. I am the Nyaya-Gati AI Assistant. How can I help you today?`, sender: 'bot', timestamp: new Date().toISOString() }
  ]);
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const generateResponse = (query: string): string => {
    const q = query.toLowerCase();
    
    // Case Status Match
    const caseMatch = q.match(/nyg\/\d{4}\/\d{5}/i);
    if (caseMatch) {
      const caseId = caseMatch[0].toUpperCase();
      const foundCase = cases.find(c => c.case_number === caseId);
      if (foundCase) {
        return `Case ${caseId} is currently in the **${foundCase.status}** stage. The next hearing is scheduled for ${foundCase.next_hearing_date || 'TBD'}. The AI Merit Score is ${foundCase.merit_score || 'N/A'}.`;
      }
      return `I could not find a case with ID ${caseId}. Please verify the number.`;
    }

    if (q.includes('criminal')) {
      const count = cases.filter(c => c.case_type === 'criminal').length;
      return `There are currently ${count} criminal cases in the system docket.`;
    }

    if (q.includes('my cases') || q.includes('my hearings')) {
      if (currentUser?.role === 'lawyer') {
        const myCases = cases.filter(c => c.lawyer_name === currentUser.email);
        return `You are currently representing ${myCases.length} cases.`;
      }
    }

    if (q.includes('hello') || q.includes('hi')) {
      return "Hello! You can ask me about specific case IDs (e.g., NYG/2024/00001), or general statistics.";
    }

    return "I'm sorry, I couldn't understand that query. I am a prototype AI. Try asking 'What is the status of NYG/2024/00001' or 'Show me criminal cases'.";
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputValue.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');

    // Simulate AI thinking
    setTimeout(() => {
      const botMsg: Message = {
        id: Date.now() + 1,
        text: generateResponse(userMsg.text),
        sender: 'bot',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, botMsg]);
    }, 1000);
  };

  if (!currentUser) return null;

  return (
    <>
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-judicial-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-judicial-700 hover:-translate-y-1 transition-all z-50 animate-bounce-in"
        >
          <MessageSquare size={24} />
        </button>
      )}

      {isOpen && (
        <div className="fixed bottom-6 right-6 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-fade-in-up origin-bottom-right">
          <div className="bg-judicial-900 text-white p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-judicial-700 p-1.5 rounded-lg">
                <Bot size={20} className="text-blue-300" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Nyaya-Gati Assistant</h3>
                <p className="text-[10px] text-judicial-300 uppercase tracking-widest font-semibold">Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-judicial-300 hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 p-4 bg-slate-50 overflow-y-auto h-80 custom-scrollbar flex flex-col gap-3">
            {messages.map(m => (
              <div key={m.id} className={`flex gap-2 ${m.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${m.sender === 'user' ? 'bg-slate-300 text-slate-600' : 'bg-judicial-100 text-judicial-600'}`}>
                  {m.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                </div>
                <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${
                  m.sender === 'user' 
                    ? 'bg-judicial-600 text-white rounded-tr-none' 
                    : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-100 flex gap-2">
            <input 
              type="text" 
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask about a case..." 
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-judicial-400 outline-none"
            />
            <button 
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-judicial-600 text-white w-10 h-10 rounded-xl flex items-center justify-center disabled:opacity-50 hover:bg-judicial-700 transition-colors"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
