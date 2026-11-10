const fs = require('fs');
const path = require('path');

class FolderScanner {
  static scan(folderPath) {
    if (!fs.existsSync(folderPath)) {
      throw new Error(`Directory does not exist: ${folderPath}`);
    }

    const files = fs.readdirSync(folderPath);
    const imageFiles = files.filter(f => f.toLowerCase().endsWith('.png') || f.toLowerCase().endsWith('.jpg') || f.toLowerCase().endsWith('.jpeg'));

    const items = [];
    for (const file of imageFiles) {
      const fullPath = path.join(folderPath, file);
      // Clean filename to get GLID
      // e.g. "1-355104-001-00 done triet.png" -> "1-355104-001-00"
      // "2-550615-051-00_done Triet.png" -> "2-550615-051-00"
      const nameWithoutExt = path.parse(file).name;
      const glidMatch = nameWithoutExt.match(/^([12]-\d{6}-\d{3}-\d{2})/);
      const glid = glidMatch ? glidMatch[1] : nameWithoutExt.replace(/(_|\s)+done.*$/i, '').trim();

      items.push({
        fileName: file,
        filePath: fullPath,
        glid: glid,
        rawName: nameWithoutExt
      });
    }

    return items;
  }
}

module.exports = { FolderScanner };

