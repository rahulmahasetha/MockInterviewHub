const ResumeSection = require('../models/ResumeSection');
const { getIsMongoDBConnected } = require('../config/db');
const { readFallbackData, writeFallbackData } = require('../utils/dbFallback');
const { DEFAULT_RESUME_SECTIONS } = require('../utils/seeder');

const getSections = async (req, res) => {
  if (getIsMongoDBConnected()) {
    try {
      const sections = await ResumeSection.find().sort({ displayOrder: 1 });
      res.json({ success: true, sections });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    res.json({ success: true, sections: data.resumeSections || DEFAULT_RESUME_SECTIONS });
  }
};

const createSection = async (req, res) => {
  const { name, key, icon, description, isRequired, allowMultiple, isActive } = req.body;
  if (!name || !key) return res.status(400).json({ error: 'Name and Key are required' });

  if (getIsMongoDBConnected()) {
    try {
      const count = await ResumeSection.countDocuments();
      const newSection = new ResumeSection({
        name, key, icon, description, isRequired, allowMultiple, isActive,
        displayOrder: count
      });
      await newSection.save();
      res.status(201).json({ success: true, section: newSection });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    const newSection = {
      _id: Date.now().toString(),
      name, key, icon, description, isRequired, allowMultiple, isActive: isActive !== false,
      displayOrder: data.resumeSections.length
    };
    data.resumeSections.push(newSection);
    writeFallbackData(data);
    res.status(201).json({ success: true, section: newSection });
  }
};

const reorderSections = async (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds must be an array' });

  if (getIsMongoDBConnected()) {
    try {
      const bulkOps = orderedIds.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { displayOrder: index } }
      }));
      await ResumeSection.bulkWrite(bulkOps);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    orderedIds.forEach((id, index) => {
      const section = data.resumeSections.find(s => s._id === id || s.key === id);
      if (section) section.displayOrder = index;
    });
    data.resumeSections.sort((a, b) => a.displayOrder - b.displayOrder);
    writeFallbackData(data);
    res.json({ success: true });
  }
};

const updateSection = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (getIsMongoDBConnected()) {
    try {
      const updated = await ResumeSection.findByIdAndUpdate(id, updates, { new: true });
      res.json({ success: true, section: updated });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    const index = data.resumeSections.findIndex(s => s._id === id || s.key === id);
    if (index !== -1) {
      data.resumeSections[index] = { ...data.resumeSections[index], ...updates };
      writeFallbackData(data);
      res.json({ success: true, section: data.resumeSections[index] });
    } else {
      res.status(404).json({ error: 'Section not found' });
    }
  }
};

const deleteSection = async (req, res) => {
  const { id } = req.params;
  if (getIsMongoDBConnected()) {
    try {
      await ResumeSection.findByIdAndDelete(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    const data = readFallbackData();
    if (!data.resumeSections) data.resumeSections = [...DEFAULT_RESUME_SECTIONS];
    data.resumeSections = data.resumeSections.filter(s => s._id !== id && s.key !== id);
    writeFallbackData(data);
    res.json({ success: true });
  }
};

module.exports = { getSections, createSection, reorderSections, updateSection, deleteSection };
