const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf8');

// The multi_replace_file_content accidentally wrote literal backslashes
// like \` and \$ in the file. We need to replace them back with ` and $.
// Also \s* became \\s* probably.

content = content.replace(/\\`/g, '`');
content = content.replace(/\\\$/g, '$');
content = content.replace(/\\\\s\*/g, '\\s*');

fs.writeFileSync('server.js', content);
console.log('Syntax fix applied');
