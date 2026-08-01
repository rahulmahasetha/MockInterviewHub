import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FaArrowLeft, FaPlus, FaTrash, FaSave, FaEye, FaDownload } from 'react-icons/fa';
import * as Icons from 'react-icons/fa';

const API_BASE = 'http://localhost:3001/api';

export default function ResumeBuilder() {
  const navigate = useNavigate();
  const [sections, setSections] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Resume Data State
  const [personalDetails, setPersonalDetails] = useState({
    fullName: '', email: '', phone: '', linkedin: '', github: '', website: ''
  });
  
  const [dynamicData, setDynamicData] = useState({});

  useEffect(() => {
    const fetchSections = async () => {
      try {
        const res = await axios.get(`${API_BASE}/admin/sections`);
        const activeSections = (res.data.sections || []).filter(s => s.isActive);
        setSections(activeSections);

        // Initialize state for each section
        const initialData = {};
        activeSections.forEach(sec => {
          if (sec.allowMultiple) {
            initialData[sec.key] = [];
          } else {
            initialData[sec.key] = '';
          }
        });
        setDynamicData(initialData);
      } catch (err) {
        toast.error('Failed to load resume sections');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSections();
  }, []);

  const handleDynamicChange = (sectionKey, value) => {
    setDynamicData(prev => ({ ...prev, [sectionKey]: value }));
  };

  const handleArrayAdd = (sectionKey) => {
    setDynamicData(prev => ({
      ...prev,
      [sectionKey]: [...(prev[sectionKey] || []), '']
    }));
  };

  const handleArrayChange = (sectionKey, index, value) => {
    const arr = [...(dynamicData[sectionKey] || [])];
    arr[index] = value;
    setDynamicData(prev => ({ ...prev, [sectionKey]: arr }));
  };

  const handleArrayDelete = (sectionKey, index) => {
    const arr = [...(dynamicData[sectionKey] || [])];
    arr.splice(index, 1);
    setDynamicData(prev => ({ ...prev, [sectionKey]: arr }));
  };

  if (isLoading) {
    return <div style={{ color: '#fff', padding: '40px', textAlign: 'center' }}>Loading Resume Builder...</div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: 'rgba(15,23,42,0.8)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button onClick={() => navigate('/')} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <FaArrowLeft />
          </button>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>Dynamic Resume Builder</h1>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#e2e8f0', padding: '10px 16px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaDownload /> Export PDF
          </button>
          <button style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(99,102,241,0.4)' }}>
            <FaSave /> Save Resume
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Pane: Editor */}
        <div style={{ width: '45%', minWidth: '400px', background: 'rgba(30,41,59,0.3)', borderRight: '1px solid rgba(255,255,255,0.1)', padding: '30px', overflowY: 'auto' }}>
          
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '1.2rem', color: '#6366f1', fontWeight: 700, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>Personal Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <input value={personalDetails.fullName} onChange={e => setPersonalDetails({...personalDetails, fullName: e.target.value})} placeholder="Full Name" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', outline: 'none' }} />
              <input value={personalDetails.email} onChange={e => setPersonalDetails({...personalDetails, email: e.target.value})} placeholder="Email" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', outline: 'none' }} />
              <input value={personalDetails.phone} onChange={e => setPersonalDetails({...personalDetails, phone: e.target.value})} placeholder="Phone" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', outline: 'none' }} />
              <input value={personalDetails.linkedin} onChange={e => setPersonalDetails({...personalDetails, linkedin: e.target.value})} placeholder="LinkedIn URL" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', outline: 'none' }} />
              <input value={personalDetails.github} onChange={e => setPersonalDetails({...personalDetails, github: e.target.value})} placeholder="GitHub URL" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', outline: 'none' }} />
              <input value={personalDetails.website} onChange={e => setPersonalDetails({...personalDetails, website: e.target.value})} placeholder="Portfolio Website" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)', color: '#f1f5f9', outline: 'none' }} />
            </div>
          </div>

          {sections.map(sec => {
            const Icon = Icons[sec.icon] || Icons.FaFileAlt;
            return (
              <div key={sec.key} style={{ marginBottom: '32px', background: 'rgba(15,23,42,0.4)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.1rem', color: '#e2e8f0', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon style={{ color: '#818cf8' }} /> {sec.name} {sec.isRequired && <span style={{ color: '#ef4444' }}>*</span>}
                  </h2>
                  {sec.allowMultiple && (
                    <button onClick={() => handleArrayAdd(sec.key)} style={{ background: 'rgba(16,185,129,0.2)', border: 'none', color: '#10b981', padding: '6px 12px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FaPlus /> Add Entry
                    </button>
                  )}
                </div>
                
                {sec.description && <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '-10px', marginBottom: '16px' }}>{sec.description}</p>}

                {sec.allowMultiple ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(dynamicData[sec.key] || []).map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '10px' }}>
                        <textarea
                          value={item}
                          onChange={(e) => handleArrayChange(sec.key, idx, e.target.value)}
                          placeholder={`Enter ${sec.name.toLowerCase()} detail...`}
                          style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.6)', color: '#f1f5f9', outline: 'none', resize: 'vertical', minHeight: '60px' }}
                        />
                        <button onClick={() => handleArrayDelete(sec.key, idx)} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#f87171', padding: '12px', borderRadius: '8px', cursor: 'pointer' }}>
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                    {(dynamicData[sec.key] || []).length === 0 && (
                      <div style={{ fontSize: '0.9rem', color: '#475569', fontStyle: 'italic' }}>No entries added yet.</div>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={dynamicData[sec.key] || ''}
                    onChange={(e) => handleDynamicChange(sec.key, e.target.value)}
                    placeholder={`Enter your ${sec.name.toLowerCase()}...`}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(30,41,59,0.6)', color: '#f1f5f9', outline: 'none', resize: 'vertical', minHeight: '100px' }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Right Pane: Live Preview */}
        <div style={{ flex: 1, padding: '40px', background: '#e2e8f0', overflowY: 'auto' }}>
          <div style={{ background: '#fff', maxWidth: '800px', margin: '0 auto', minHeight: '1000px', padding: '50px', boxShadow: '0 20px 40px rgba(0,0,0,0.1)', borderRadius: '4px' }}>
            
            {/* Preview Header */}
            <div style={{ textAlign: 'center', borderBottom: '2px solid #334155', paddingBottom: '20px', marginBottom: '30px' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase' }}>
                {personalDetails.fullName || 'YOUR NAME'}
              </h1>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap', color: '#475569', fontSize: '0.95rem', marginTop: '12px' }}>
                {personalDetails.email && <span>{personalDetails.email}</span>}
                {personalDetails.phone && <span>• {personalDetails.phone}</span>}
                {personalDetails.linkedin && <span>• {personalDetails.linkedin}</span>}
                {personalDetails.github && <span>• {personalDetails.github}</span>}
                {personalDetails.website && <span>• {personalDetails.website}</span>}
              </div>
            </div>

            {/* Preview Sections */}
            {sections.map(sec => {
              const data = dynamicData[sec.key];
              const hasData = sec.allowMultiple ? data?.length > 0 && data.some(d => d.trim() !== '') : data?.trim() !== '';
              
              if (!hasData) return null;

              return (
                <div key={sec.key} style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #cbd5e1', paddingBottom: '6px', marginBottom: '12px' }}>
                    {sec.name}
                  </h3>
                  
                  {sec.allowMultiple ? (
                    <ul style={{ paddingLeft: '20px', margin: 0, color: '#334155', fontSize: '0.95rem', lineHeight: 1.6 }}>
                      {data.filter(d => d.trim()).map((item, idx) => (
                        <li key={idx} style={{ marginBottom: '8px' }}>
                          <span dangerouslySetInnerHTML={{ __html: item.replace(/\n/g, '<br/>') }} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: (data || '').replace(/\n/g, '<br/>') }} />
                  )}
                </div>
              );
            })}

          </div>
        </div>

      </div>
    </div>
  );
}
