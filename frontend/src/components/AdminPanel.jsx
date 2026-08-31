import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { quizAPI } from '../services/api';
import { toast } from 'react-toastify';
import {
  FaArrowLeft, FaPlus, FaEdit, FaTrash,
  FaCheckCircle, FaTimesCircle, FaSave, FaTimes, FaCog,
  FaFolder, FaQuestionCircle
} from 'react-icons/fa';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({
    slug: '', name: '', label: '', color: '#E0F2FE', iconColor: '#0284C7', description: '', parentCategory: '', levels: []
  });

  // Level Modal
  const [isLevelModalOpen, setIsLevelModalOpen] = useState(false);
  const [isEditingLevel, setIsEditingLevel] = useState(false);
  const [currentLevel, setCurrentLevel] = useState({
    level: 1, question: '', options: ['', '', '', ''], answer: '', hint: '', points: 10
  });
  const [activeCategorySlug, setActiveCategorySlug] = useState(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await quizAPI.getCategories();
      setCategories(res.data || []);
    } catch (err) {
      toast.error('Failed to load quiz categories');
    } finally {
      setIsLoading(false);
    }
  };

  const openCategoryModal = (category = null) => {
    if (category) {
      setIsEditingCategory(true);
      setCurrentCategory({ ...category });
    } else {
      setIsEditingCategory(false);
      setCurrentCategory({
        slug: '', name: '', label: '', color: '#E0F2FE', iconColor: '#0284C7', description: '', parentCategory: '', levels: []
      });
    }
    setIsCategoryModalOpen(true);
  };

  const saveCategory = async () => {
    if (!currentCategory.slug || !currentCategory.name) {
      toast.error('Slug and Name are required');
      return;
    }
    try {
      if (isEditingCategory) {
        const res = await quizAPI.updateCategory(currentCategory.slug, currentCategory);
        setCategories(categories.map(c => c.slug === currentCategory.slug ? res.data : c));
        toast.success('Category updated');
      } else {
        const res = await quizAPI.createCategory(currentCategory);
        setCategories([...categories, res.data]);
        toast.success('Category created');
      }
      setIsCategoryModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save category');
    }
  };

  const deleteCategory = async (slug) => {
    if (!window.confirm(`Are you sure you want to delete category ${slug}?`)) return;
    try {
      await quizAPI.deleteCategory(slug);
      setCategories(categories.filter(c => c.slug !== slug));
      toast.success('Category deleted');
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  const openLevelModal = (categorySlug, levelObj = null) => {
    setActiveCategorySlug(categorySlug);
    const category = categories.find(c => c.slug === categorySlug);
    if (levelObj) {
      setIsEditingLevel(true);
      setCurrentLevel({ ...levelObj });
    } else {
      setIsEditingLevel(false);
      setCurrentLevel({
        level: category.levels.length + 1, question: '', options: ['', '', '', ''], answer: '', hint: '', points: 10
      });
    }
    setIsLevelModalOpen(true);
  };

  const saveLevel = async () => {
    if (!currentLevel.question || !currentLevel.answer || currentLevel.options.some(o => !o)) {
      toast.error('Question, Answer, and all Options are required');
      return;
    }
    try {
      const category = categories.find(c => c.slug === activeCategorySlug);
      let newLevels = [...category.levels];
      
      if (isEditingLevel) {
        const idx = newLevels.findIndex(l => l.level === currentLevel.level);
        if (idx !== -1) newLevels[idx] = currentLevel;
      } else {
        newLevels.push(currentLevel);
      }

      const updatedCategory = { ...category, levels: newLevels };
      const res = await quizAPI.updateCategory(category.slug, updatedCategory);
      
      setCategories(categories.map(c => c.slug === category.slug ? res.data : c));
      toast.success('Level saved successfully');
      setIsLevelModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save level');
    }
  };

  const deleteLevel = async (categorySlug, levelNumber) => {
    if (!window.confirm(`Are you sure you want to delete level ${levelNumber}?`)) return;
    try {
      const category = categories.find(c => c.slug === categorySlug);
      const newLevels = category.levels.filter(l => l.level !== levelNumber);
      newLevels.forEach((l, idx) => l.level = idx + 1);

      const updatedCategory = { ...category, levels: newLevels };
      const res = await quizAPI.updateCategory(category.slug, updatedCategory);
      
      setCategories(categories.map(c => c.slug === category.slug ? res.data : c));
      toast.success('Level deleted');
    } catch (err) {
      toast.error('Failed to delete level');
    }
  };

  if (isLoading) {
    return <div className="admin-loading">Loading Admin Portal...</div>;
  }

  const groupedCategories = categories.reduce((acc, cat) => {
    const parent = cat.parentCategory || 'Root Categories';
    if (!acc[parent]) acc[parent] = [];
    acc[parent].push(cat);
    return acc;
  }, {});

  return (
    <div className="admin-portal-container">
      <div className="admin-header">
        <div className="admin-header-content">
          <button onClick={() => navigate('/')} className="admin-back-btn">
            <FaArrowLeft /> Back to Home
          </button>
          <h1><FaCog style={{ color: '#2563EB' }} /> Admin Portal</h1>
        </div>
        <button onClick={() => openCategoryModal()} className="admin-add-btn">
          <FaPlus /> Add Category
        </button>
      </div>

      <div className="admin-content">
        {Object.keys(groupedCategories).map((parentName) => (
          <div key={parentName} className="admin-category-group">
            <h2 className="admin-group-title"><FaFolder /> {parentName}</h2>
            <div className="admin-grid">
              {groupedCategories[parentName].map(cat => (
                <div key={cat.slug} className="admin-card">
                  <div className="admin-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="admin-badge" style={{ backgroundColor: cat.color, color: cat.iconColor }}>{cat.label}</span>
                      <h3>{cat.name}</h3>
                    </div>
                    <div className="admin-actions">
                      <button onClick={() => openCategoryModal(cat)} className="btn-icon edit"><FaEdit /></button>
                      <button onClick={() => deleteCategory(cat.slug)} className="btn-icon delete"><FaTrash /></button>
                    </div>
                  </div>
                  <p className="admin-desc">{cat.description}</p>
                  
                  <div className="admin-levels">
                    <div className="admin-levels-header">
                      <h4>Levels ({cat.levels.length})</h4>
                      <button onClick={() => openLevelModal(cat.slug)} className="btn-small"><FaPlus /> Add Level</button>
                    </div>
                    {cat.levels.length === 0 && <p className="no-data">No levels added yet.</p>}
                    <ul className="admin-level-list">
                      {cat.levels.map(lvl => (
                        <li key={lvl.level} className="admin-level-item">
                          <div className="lvl-info">
                            <strong>Level {lvl.level}:</strong> {lvl.question}
                            <span className="lvl-points">{lvl.points} pts</span>
                          </div>
                          <div className="lvl-actions">
                            <button onClick={() => openLevelModal(cat.slug, lvl)} className="btn-icon-small edit"><FaEdit /></button>
                            <button onClick={() => deleteLevel(cat.slug, lvl.level)} className="btn-icon-small delete"><FaTrash /></button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {isCategoryModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="admin-modal-header">
              <h3>{isEditingCategory ? 'Edit Category' : 'Add Category'}</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="admin-modal-body">
              <label>Name</label>
              <input value={currentCategory.name} onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})} placeholder="e.g. Java Basics" />
              
              <label>Slug (Unique ID)</label>
              <input value={currentCategory.slug} onChange={e => setCurrentCategory({...currentCategory, slug: e.target.value.toLowerCase().replace(/\s/g, '-')})} placeholder="e.g. java-basics" disabled={isEditingCategory} />
              
              <label>Parent Category</label>
              <input value={currentCategory.parentCategory} onChange={e => setCurrentCategory({...currentCategory, parentCategory: e.target.value})} placeholder="e.g. Programming (Leave empty for root)" />
              
              <label>Description</label>
              <textarea value={currentCategory.description} onChange={e => setCurrentCategory({...currentCategory, description: e.target.value})} placeholder="Brief description of this category"></textarea>
              
              <div className="input-row">
                <div>
                  <label>Label</label>
                  <input value={currentCategory.label} onChange={e => setCurrentCategory({...currentCategory, label: e.target.value})} placeholder="e.g. JAVA" />
                </div>
                <div>
                  <label>Background Color</label>
                  <input type="color" value={currentCategory.color} onChange={e => setCurrentCategory({...currentCategory, color: e.target.value})} />
                </div>
                <div>
                  <label>Icon Color</label>
                  <input type="color" value={currentCategory.iconColor} onChange={e => setCurrentCategory({...currentCategory, iconColor: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setIsCategoryModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveCategory} className="btn-primary"><FaSave /> Save Category</button>
            </div>
          </div>
        </div>
      )}

      {isLevelModalOpen && (
        <div className="admin-modal-overlay">
          <div className="admin-modal modal-large">
            <div className="admin-modal-header">
              <h3>{isEditingLevel ? `Edit Level ${currentLevel.level}` : 'Add New Level'}</h3>
              <button onClick={() => setIsLevelModalOpen(false)} className="close-btn"><FaTimes /></button>
            </div>
            <div className="admin-modal-body">
              <label>Level Number</label>
              <input type="number" value={currentLevel.level} onChange={e => setCurrentLevel({...currentLevel, level: parseInt(e.target.value)})} disabled={isEditingLevel} />
              
              <label>Points</label>
              <input type="number" value={currentLevel.points} onChange={e => setCurrentLevel({...currentLevel, points: parseInt(e.target.value)})} />
              
              <label>Question</label>
              <textarea value={currentLevel.question} onChange={e => setCurrentLevel({...currentLevel, question: e.target.value})} rows="3"></textarea>
              
              <label>Options (4)</label>
              {currentLevel.options.map((opt, idx) => (
                <input 
                  key={idx} 
                  value={opt} 
                  onChange={e => {
                    const newOptions = [...currentLevel.options];
                    newOptions[idx] = e.target.value;
                    setCurrentLevel({...currentLevel, options: newOptions});
                  }} 
                  placeholder={`Option ${idx + 1}`} 
                  style={{ marginBottom: '8px' }}
                />
              ))}

              <label>Correct Answer (Must exactly match one option)</label>
              <input value={currentLevel.answer} onChange={e => setCurrentLevel({...currentLevel, answer: e.target.value})} />

              <label>Hint</label>
              <input value={currentLevel.hint} onChange={e => setCurrentLevel({...currentLevel, hint: e.target.value})} />
            </div>
            <div className="admin-modal-footer">
              <button onClick={() => setIsLevelModalOpen(false)} className="btn-secondary">Cancel</button>
              <button onClick={saveLevel} className="btn-primary"><FaSave /> Save Level</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
