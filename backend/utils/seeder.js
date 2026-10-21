const Leaderboard = require('../models/Leaderboard');
const QuizCategory = require('../models/QuizCategory');
const ResumeSection = require('../models/ResumeSection');
const { readFallbackData } = require('./dbFallback');

const { QUIZ_CATEGORIES, buildLevels } = require('../data/quizCategoriesData');


const DEFAULT_RESUME_SECTIONS = [
  { name: 'Summary', key: 'summary', icon: 'FaFileAlt', description: 'A brief overview of your professional background.', isRequired: true, allowMultiple: false },
  { name: 'Skills', key: 'skills', icon: 'FaCode', description: 'Core competencies and technical skills.', isRequired: true, allowMultiple: true },
  { name: 'Experience', key: 'experience', icon: 'FaBriefcase', description: 'Your professional work history.', isRequired: false, allowMultiple: true },
  { name: 'Internships', key: 'internships', icon: 'FaUserGraduate', description: 'Internships and trainee programs.', isRequired: false, allowMultiple: true },
  { name: 'Projects', key: 'projects', icon: 'FaFolderOpen', description: 'Notable projects you have built.', isRequired: false, allowMultiple: true },
  { name: 'Education', key: 'education', icon: 'FaGraduationCap', description: 'Academic background and degrees.', isRequired: true, allowMultiple: true },
  { name: 'Certifications', key: 'certifications', icon: 'FaCertificate', description: 'Professional certifications and licenses.', isRequired: false, allowMultiple: true },
  { name: 'Achievements', key: 'achievements', icon: 'FaTrophy', description: 'Notable awards and accomplishments.', isRequired: false, allowMultiple: true },
  { name: 'Technologies', key: 'technologies', icon: 'FaLaptopCode', description: 'Tools and frameworks you use.', isRequired: false, allowMultiple: true },
  { name: 'Publications', key: 'publications', icon: 'FaBook', description: 'Published papers or articles.', isRequired: false, allowMultiple: true },
  { name: 'Research', key: 'research', icon: 'FaMicroscope', description: 'Academic or professional research.', isRequired: false, allowMultiple: true },
  { name: 'Patents', key: 'patents', icon: 'FaLightbulb', description: 'Patents filed or granted.', isRequired: false, allowMultiple: true },
  { name: 'Awards', key: 'awards', icon: 'FaMedal', description: 'Honors and awards received.', isRequired: false, allowMultiple: true },
  { name: 'Volunteer Experience', key: 'volunteer', icon: 'FaHandsHelping', description: 'Volunteer work and community service.', isRequired: false, allowMultiple: true },
  { name: 'Positions of Responsibility', key: 'responsibility', icon: 'FaUsers', description: 'Leadership roles in clubs or organizations.', isRequired: false, allowMultiple: true },
  { name: 'Hackathons', key: 'hackathons', icon: 'FaLaptop', description: 'Hackathons participated in.', isRequired: false, allowMultiple: true },
  { name: 'Competitions', key: 'competitions', icon: 'FaFlagCheckered', description: 'Competitive programming or other contests.', isRequired: false, allowMultiple: true },
  { name: 'Training', key: 'training', icon: 'FaChalkboardTeacher', description: 'Professional training completed.', isRequired: false, allowMultiple: true },
  { name: 'Workshops', key: 'workshops', icon: 'FaTools', description: 'Workshops attended or conducted.', isRequired: false, allowMultiple: true },
  { name: 'Languages', key: 'languages', icon: 'FaLanguage', description: 'Languages you can speak or write.', isRequired: false, allowMultiple: true },
  { name: 'Interests', key: 'interests', icon: 'FaHeart', description: 'Hobbies and personal interests.', isRequired: false, allowMultiple: true },
  { name: 'Extracurricular Activities', key: 'extracurricular', icon: 'FaFutbol', description: 'Activities outside of academics/work.', isRequired: false, allowMultiple: true },
  { name: 'References', key: 'references', icon: 'FaAddressBook', description: 'Professional references.', isRequired: false, allowMultiple: true },
];

async function seedDefaultData() {
  try {
    const count = await Leaderboard.countDocuments();
    if (count === 0) {
      console.log('Seeding initial leaderboard entries to MongoDB...');
      const fallback = readFallbackData();
      await Leaderboard.insertMany(fallback.leaderboard);
      console.log('Leaderboard seeding complete.');
    }
  } catch (err) {
    console.error('Error seeding data:', err);
  }
}

async function seedQuizData() {
  try {
    for (const category of QUIZ_CATEGORIES) {
      await QuizCategory.findOneAndUpdate(
        { slug: category.slug },
        category,
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    console.log(`Quiz categories synced to MongoDB: ${QUIZ_CATEGORIES.length}`);
  } catch (err) {
    console.error('Error seeding quiz categories:', err);
  }
}

async function seedResumeSections() {
  try {
    const count = await ResumeSection.countDocuments();
    if (count === 0) {
      console.log('Seeding default resume sections to MongoDB...');
      const sectionsToInsert = DEFAULT_RESUME_SECTIONS.map((sec, index) => ({
        ...sec,
        displayOrder: index
      }));
      await ResumeSection.insertMany(sectionsToInsert);
      console.log(`Seeded ${sectionsToInsert.length} resume sections.`);
    }
  } catch (err) {
    console.error('Error seeding resume sections:', err);
  }
}

async function cleanupDuplicateLeaderboardEntries() {
  try {
    const rows = await Leaderboard.find().sort({ score: -1, _id: 1 });
    const keepByName = new Map();
    const duplicateIds = [];

    for (const row of rows) {
      const key = row.name?.toLowerCase();
      if (!key) continue;

      if (keepByName.has(key)) {
        duplicateIds.push(row._id);
      } else {
        keepByName.set(key, row._id);
      }
    }

    if (duplicateIds.length > 0) {
      await Leaderboard.deleteMany({ _id: { $in: duplicateIds } });
      console.log(`Cleaned ${duplicateIds.length} duplicate leaderboard row(s).`);
    }
  } catch (err) {
    console.error('Error cleaning duplicate leaderboard entries:', err);
  }
}

module.exports = {
  QUIZ_CATEGORIES,
  DEFAULT_RESUME_SECTIONS,
  seedDefaultData,
  seedQuizData,
  seedResumeSections,
  cleanupDuplicateLeaderboardEntries
};
