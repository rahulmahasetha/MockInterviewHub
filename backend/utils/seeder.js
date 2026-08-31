const Leaderboard = require('../models/Leaderboard');
const QuizCategory = require('../models/QuizCategory');
const ResumeSection = require('../models/ResumeSection');
const { readFallbackData } = require('./dbFallback');

const buildLevels = (questions) => {
  const levels = [];
  const LEVELS_PER_CATEGORY = 10;
  for (let i = 0; i < LEVELS_PER_CATEGORY; i++) {
    const item = questions[i % questions.length] || { question: 'Question not available', options: [], answer: '', hint: '' };
    levels.push({
      level: i + 1,
      question: item.question,
      options: item.options,
      answer: item.answer,
      hint: item.hint
    });
  }
  return levels;
};

const QUIZ_CATEGORIES = [
  {
    slug: 'science',
    name: 'Java Programming Quiz',
    legacyName: 'Science',
    label: 'JAVA',
    color: '#E0F2FE',
    iconColor: '#0284C7',
    description: 'Practice Java basics, OOP, collections, and syntax.',
    levels: buildLevels([
      { question: 'In Java, which keyword is used to create a class?', options: ['class', 'struct', 'define', 'object'], answer: 'class', hint: 'Every Java program commonly starts by declaring this type.' },
      { question: 'Which method is the standard entry point of a Java application?', options: ['main', 'start', 'run', 'init'], answer: 'main', hint: 'It is usually written as public static void main.' },
      { question: 'Which Java keyword creates an object instance?', options: ['new', 'make', 'create', 'malloc'], answer: 'new', hint: 'It calls a constructor.' },
      { question: 'Which Java type stores true or false values?', options: ['boolean', 'bool', 'bit', 'truth'], answer: 'boolean', hint: 'Java uses the full word, not bool.' },
      { question: 'Which Java collection stores key-value pairs?', options: ['HashMap', 'ArrayList', 'Stack', 'StringBuilder'], answer: 'HashMap', hint: 'It maps keys to values.' }
    ])
  },
  {
    slug: 'jungle',
    name: 'C Programming Quiz',
    legacyName: 'Jungle',
    label: 'C',
    color: '#DCFCE7',
    iconColor: '#16A34A',
    description: 'Review C fundamentals, pointers, memory, and printf.',
    levels: buildLevels([
      { question: 'Which function is the entry point of a C program?', options: ['main', 'start', 'init', 'program'], answer: 'main', hint: 'Execution begins from this function.' },
      { question: 'Which header file is needed for printf?', options: ['stdio.h', 'stdlib.h', 'string.h', 'math.h'], answer: 'stdio.h', hint: 'It stands for standard input/output.' },
      { question: 'Which operator gives the address of a variable in C?', options: ['&', '*', '%', '#'], answer: '&', hint: 'It is also called the address-of operator.' },
      { question: 'Which function is commonly used to allocate memory dynamically in C?', options: ['malloc', 'new', 'allocObject', 'memory'], answer: 'malloc', hint: 'It comes from stdlib.h.' },
      { question: 'Which format specifier prints an integer using printf?', options: ['%d', '%s', '%f', '%c'], answer: '%d', hint: 'It is used for decimal integers.' }
    ])
  },
  {
    slug: 'math',
    name: 'C++ Programming Quiz',
    legacyName: 'Math',
    label: 'C++',
    color: '#EEF2FF',
    iconColor: '#4F46E5',
    description: 'Practice C++ OOP, STL, scope, and dynamic allocation.',
    levels: buildLevels([
      { question: 'Which C++ feature allows multiple functions to share the same name with different parameters?', options: ['Function overloading', 'Inheritance', 'Encapsulation', 'Namespace locking'], answer: 'Function overloading', hint: 'The compiler chooses based on the parameter list.' },
      { question: 'Which C++ keyword is used to create a class object dynamically?', options: ['new', 'malloc', 'make', 'object'], answer: 'new', hint: 'It calls the constructor and returns a pointer.' },
      { question: 'Which standard library container is a dynamic array?', options: ['vector', 'map', 'set', 'queue'], answer: 'vector', hint: 'It grows as elements are added.' },
      { question: 'Which concept lets a derived class reuse a base class?', options: ['Inheritance', 'Compilation', 'Tokenization', 'Linking'], answer: 'Inheritance', hint: 'It models an is-a relationship.' },
      { question: 'Which operator is used for scope resolution in C++?', options: ['::', '->', '.', '&&'], answer: '::', hint: 'It is used with namespaces and class members.' }
    ])
  },
  {
    slug: 'history',
    name: 'Python Programming Quiz',
    legacyName: 'History',
    label: 'PY',
    color: '#FEF3C7',
    iconColor: '#D97706',
    description: 'Learn Python functions, lists, dictionaries, and modules.',
    levels: buildLevels([
      { question: 'Which keyword defines a function in Python?', options: ['def', 'func', 'function', 'lambda-only'], answer: 'def', hint: 'It appears before the function name.' },
      { question: 'Which Python data type stores key-value pairs?', options: ['dict', 'list', 'tuple', 'set-only'], answer: 'dict', hint: 'It is short for dictionary.' },
      { question: 'Which keyword is used to handle exceptions in Python?', options: ['try', 'check', 'guard', 'catch-only'], answer: 'try', hint: 'It is usually paired with except.' },
      { question: 'Which method adds an item to the end of a Python list?', options: ['append', 'push', 'addLast', 'insertEnd'], answer: 'append', hint: 'It is called on the list object.' },
      { question: 'Which Python statement imports a module?', options: ['import', 'include', 'require', 'using'], answer: 'import', hint: 'It loads modules such as math or os.' }
    ])
  },
  {
    slug: 'html',
    name: 'HTML Programming Quiz',
    label: 'HTML',
    color: '#FFEDD5',
    iconColor: '#EA580C',
    description: 'Practice semantic HTML elements, forms, links, and images.',
    levels: buildLevels([
      { question: 'Which HTML element is used for the main heading on a page?', options: ['<h1>', '<head>', '<title>', '<header-only>'], answer: '<h1>', hint: 'It is the largest semantic heading element.' },
      { question: 'Which attribute provides alternate text for an image?', options: ['alt', 'src', 'href', 'title-only'], answer: 'alt', hint: 'Screen readers use this when describing an image.' },
      { question: 'Which tag creates a clickable hyperlink?', options: ['<a>', '<link>', '<button-link>', '<href>'], answer: '<a>', hint: 'It usually uses an href attribute.' },
      { question: 'Which HTML element is best for a numbered list?', options: ['<ol>', '<ul>', '<li-only>', '<list>'], answer: '<ol>', hint: 'The letter o stands for ordered.' },
      { question: 'Which input type should be used for an email field?', options: ['email', 'mailbox', 'text-email', 'address'], answer: 'email', hint: 'Browsers can validate this format automatically.' }
    ])
  },
  {
    slug: 'css',
    name: 'CSS Programming Quiz',
    label: 'CSS',
    color: '#DBEAFE',
    iconColor: '#2563EB',
    description: 'Practice selectors, layout, spacing, and CSS units.',
    levels: buildLevels([
      { question: 'Which CSS property changes text color?', options: ['color', 'font-color', 'text-paint', 'foreground'], answer: 'color', hint: 'It directly controls the foreground text color.' },
      { question: 'Which CSS property controls the space inside an element border?', options: ['padding', 'margin', 'gap', 'outline'], answer: 'padding', hint: 'Margin is outside; this one is inside.' },
      { question: 'Which display value enables flexbox layout?', options: ['flex', 'grid-flex', 'inline-grid', 'block-flex'], answer: 'flex', hint: 'Use display with this value.' },
      { question: "Which selector targets an element with id='app'?", options: ['#app', '.app', 'app', '*app'], answer: '#app', hint: 'IDs use the hash symbol.' },
      { question: 'Which unit is relative to the root element font size?', options: ['rem', 'px', 'vh', 'percent-only'], answer: 'rem', hint: 'It means root em.' }
    ])
  },
  {
    slug: 'react',
    name: 'React Programming Quiz',
    label: 'RCT',
    color: '#E0F2FE',
    iconColor: '#0891B2',
    description: 'Practice React hooks, props, JSX, effects, and rendering.',
    levels: buildLevels([
      { question: 'Which React hook stores component state?', options: ['useState', 'useRoute', 'useClass', 'useStyle'], answer: 'useState', hint: 'It returns a value and a setter function.' },
      { question: 'What syntax lets React describe UI inside JavaScript?', options: ['JSX', 'SQL', 'YAML', 'Bash'], answer: 'JSX', hint: 'It looks like HTML, but lives in JavaScript.' },
      { question: 'Which prop is required when rendering lists of elements?', options: ['key', 'idOnly', 'indexOnly', 'name'], answer: 'key', hint: 'React uses it to identify list items efficiently.' },
      { question: 'Which hook runs side effects after render?', options: ['useEffect', 'useState', 'useMemoOnly', 'useEventLoop'], answer: 'useEffect', hint: 'It is commonly used for fetching data or subscriptions.' },
      { question: 'In React, data passed from parent to child components is called what?', options: ['props', 'signals', 'packets', 'exports'], answer: 'props', hint: 'Short for properties.' }
    ])
  },
  {
    slug: 'nodejs',
    name: 'NodeJs Programming Quiz',
    label: 'NODE',
    color: '#DCFCE7',
    iconColor: '#15803D',
    description: 'Practice Node.js runtime, modules, npm, and backend basics.',
    levels: buildLevels([
      { question: 'Which runtime lets JavaScript run outside the browser?', options: ['Node.js', 'HTML', 'CSS', 'MongoDB'], answer: 'Node.js', hint: 'It is commonly used for backend JavaScript.' },
      { question: 'Which file usually stores Node.js project dependencies?', options: ['package.json', 'index.html', 'style.css', 'README.only'], answer: 'package.json', hint: 'npm reads this file.' },
      { question: 'Which command installs dependencies listed in package.json?', options: ['npm install', 'node install', 'npm build-only', 'install node_modules'], answer: 'npm install', hint: 'It creates or updates node_modules.' },
      { question: 'Which built-in Node.js module is used to work with file paths?', options: ['path', 'route', 'url-only', 'folder'], answer: 'path', hint: 'It provides utilities like join and resolve.' },
      { question: 'What object does CommonJS use to expose values from a module?', options: ['module.exports', 'window.export', 'public.module', 'return.exports'], answer: 'module.exports', hint: 'You often see require used with this module system.' }
    ])
  },
  {
    slug: 'dsa',
    name: 'DSA Programming Quiz',
    label: 'DSA',
    color: '#F3E8FF',
    iconColor: '#9333EA',
    description: 'Practice data structures, Big O, trees, stacks, and sorting.',
    levels: buildLevels([
      { question: 'Which data structure follows Last In, First Out?', options: ['Stack', 'Queue', 'Tree', 'Graph'], answer: 'Stack', hint: 'Think of plates stacked on top of each other.' },
      { question: 'Which data structure follows First In, First Out?', options: ['Queue', 'Stack', 'Heap', 'Set'], answer: 'Queue', hint: 'Think of people waiting in line.' },
      { question: 'What is the average lookup time for a hash table?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'], answer: 'O(1)', hint: 'Hashing aims for constant time access.' },
      { question: 'Which traversal visits left subtree, root, then right subtree?', options: ['Inorder', 'Preorder', 'Postorder', 'Levelorder'], answer: 'Inorder', hint: 'The root is visited in the middle.' },
      { question: 'Which sorting algorithm repeatedly selects the smallest remaining item?', options: ['Selection Sort', 'Merge Sort', 'Quick Sort', 'Radix Sort'], answer: 'Selection Sort', hint: 'Its name describes choosing an item each pass.' }
    ])
  }
];

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
      console.log('🌱 Seeding initial leaderboard entries to MongoDB...');
      const fallback = readFallbackData();
      await Leaderboard.insertMany(fallback.leaderboard);
      console.log('✅ Seeding complete!');
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
      console.log('🌱 Seeding default resume sections to MongoDB...');
      const sectionsToInsert = DEFAULT_RESUME_SECTIONS.map((sec, index) => ({
        ...sec,
        displayOrder: index
      }));
      await ResumeSection.insertMany(sectionsToInsert);
      console.log(`✅ Seeded ${sectionsToInsert.length} resume sections!`);
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
