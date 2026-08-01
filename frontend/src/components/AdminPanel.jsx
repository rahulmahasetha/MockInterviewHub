import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaPlus, FaGripVertical, FaEdit, FaTrash,
  FaCheckCircle, FaTimesCircle, FaSave, FaTimes, FaCog
} from 'react-icons/fa';

const API_BASE = 'http://localhost:3001/api';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentSection, setCurrentSection] = useState({
    name: '', key: '', icon: 'FaFileAlt', description: '',
    isRequired: false, allowMultiple: false, isActive: true
  });

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await axios.get(`${API_BASE}/admin/sections`);
      setSections(res.data.sections || []);
    } catch (err) {
      toast.error('Failed to load sections');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    const newSections = [...sections];
    const draggedItem = newSections[draggedItemIndex];
    newSections.splice(draggedItemIndex, 1);
    newSections.splice(index, 0, draggedItem);
    
    setDraggedItemIndex(index);
    setSections(newSections);
  };

  const handleDragEnd = async () => {
    setDraggedItemIndex(null);
    try {
      const orderedIds = sections.map(s => s._id || s.key);
      await axios.put(`${API_BASE}/admin/sections/reorder`, { orderedIds });
      toast.success('Sections reordered!');
    } catch (err) {
      toast.error('Failed to save order');
      fetchSections(); // revert on fail
    }
  };

  const toggleStatus = async (section) => {
    try {
      const id = section._id || section.key;
      await axios.put(`${API_BASE}/admin/sections/${id}`, { isActive: !section.isActive });
      setSections(sections.map(s => (s._id || s.key) === id ? { ...s, isActive: !s.isActive } : s));
      toast.success(`${section.name} is now ${!section.isActive ? 'Active' : 'Inactive'}`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (section) => {
    if (!window.confirm(`Are you sure you want to delete ${section.name}?`)) return;
    try {
      const id = section._id || section.key;
      await axios.delete(`${API_BASE}/admin/sections/${id}`);
      setSections(sections.filter(s => (s._id || s.key) !== id));
      toast.success('Section deleted');
    } catch (err) {
      toast.error('Failed to delete section');
    }
  };

  const openModal = (section = null) => {
    if (section) {
      setIsEditing(true);
      setCurrentSection({ ...section });
    } else {
      setIsEditing(false);
      setCurrentSection({
        name: '', key: '', icon: 'FaFileAlt', description: '',
        isRequired: false, allowMultiple: false, isActive: true
      });
    }
    setIsModalOpen(true);
  };

  const saveSection = async () => {
    if (!currentSection.name || !currentSection.key) {
      toast.error('Name and Key are required');
      return;
    }
    try {
      if (isEditing) {
        const id = currentSection._id || currentSection.key;
        const res = await axios.put(`${API_BASE}/admin/sections/${id}`, currentSection);
        setSections(sections.map(s => (s._id || s.key) === id ? res.data.section : s));
        toast.success('Section updated');
      } else {
        const res = await axios.post(`${API_BASE}/admin/sections`, currentSection);
        setSections([...sections, res.data.section]);
        toast.success('Section created');
      }
      setIsModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save section');
    }
  };

  if (isLoading) {
    return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Admin Panel...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', padding: '40px 20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <FaArrowLeft />
            </button>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px', margin: 0 }}>
              <FaCog style={{ color: '#6366f1' }} /> Admin Panel
            </h1>
          </div>
          <button onClick={() => openModal()} style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '12px 20px', borderRadius: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            <FaPlus /> Add Section
          </button>
        </div>

        <div style={{ background: 'rgba(30,41,59,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', overflow: 'hidden' }}>
          <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#e2e8f0', margin: 0, fontWeight: 700 }}>Resume Sections Manager</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '4px', marginBottom: 0 }}>Drag and drop to reorder. Toggle status to hide/show in the Resume Builder.</p>
          </div>
          
          <div style={{ padding: '20px' }}>
            {sections.map((sec, index) => (
              <div
                key={sec._id || sec.key}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex', alignItems: 'center', gap: '16px', padding: '16px',
                  background: draggedItemIndex === index ? 'rgba(99,102,241,0.2)' : 'rgba(15,23,42,0.8)',
                  border: `1px solid ${draggedItemIndex === index ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px', marginBottom: '12px', cursor: 'grab',
                  opacity: sec.isActive ? 1 : 0.6,
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ color: '#64748b', cursor: 'grab' }}><FaGripVertical /></div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '1.1rem', fontWeight: 700, color: sec.isActive ? '#e2e8f0' : '#94a3b8' }}>{sec.name}</span>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: '12px', color: '#cbd5e1' }}>{sec.key}</span>
                    {sec.isRequired && <span style={{ fontSize: '0.7rem', background: 'rgba(239,68,68,0.2)', color: '#ef4444', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>Required</span>}
                    {sec.allowMultiple && <span style={{ fontSize: '0.7rem', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>Multiple</span>}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{sec.description || 'No description provided.'}</div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <button onClick={() => toggleStatus(sec)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.4rem', color: sec.isActive ? '#10b981' : '#64748b' }}>
                    {sec.isActive ? <FaCheckCircle /> : <FaTimesCircle />}
                  </button>
                  <button onClick={() => openModal(sec)} style={{ background: 'rgba(99,102,241,0.2)', border: 'none', color: '#818cf8', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(sec)} style={{ background: 'rgba(239,68,68,0.2)', border: 'none', color: '#f87171', padding: '8px', borderRadius: '8px', cursor: 'pointer' }}>
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '500px', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#f1f5f9', fontWeight: 700 }}>{isEditing ? 'Edit Section' : 'Add Custom Section'}</h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem' }}><FaTimes /></button>
            </div>
            
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Section Name</label>
                <input value={currentSection.name} onChange={e => setCurrentSection({...currentSection, name: e.target.value})} type="text" placeholder="e.g., Portfolio" style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#f1f5f9', outline: 'none' }} />
              </div>
              
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Unique Key (no spaces)</label>
                <input value={currentSection.key} onChange={e => setCurrentSection({...currentSection, key: e.target.value.toLowerCase().replace(/\s/g, '')})} type="text" placeholder="e.g., portfolio" style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#f1f5f9', outline: 'none' }} />
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Description</label>
                <textarea value={currentSection.description} onChange={e => setCurrentSection({...currentSection, description: e.target.value})} placeholder="What goes in this section?" rows={3} style={{ width: '100%', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px', color: '#f1f5f9', outline: 'none', resize: 'none' }} />
              </div>
              
              <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={currentSection.isRequired} onChange={e => setCurrentSection({...currentSection, isRequired: e.target.checked})} style={{ accentColor: '#6366f1' }} />
                  Required Section
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#cbd5e1', fontSize: '0.9rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={currentSection.allowMultiple} onChange={e => setCurrentSection({...currentSection, allowMultiple: e.target.checked})} style={{ accentColor: '#10b981' }} />
                  Allow Multiple Entries
                </label>
              </div>
            </div>

            <div style={{ padding: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.4)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveSection} style={{ background: '#6366f1', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}><FaSave /> Save Section</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
