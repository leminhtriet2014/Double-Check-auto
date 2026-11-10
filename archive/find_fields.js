const fs = require('fs');

function findFieldValues(tokens) {
  const result = {};
  
  // Find Buying Office / Customer Name
  const custIdx = tokens.findIndex(t => t === 'Customer Name:');
  if (custIdx !== -1) {
    // In oracle reports, values often precede or follow labels
    result['CustomerName_context'] = tokens.slice(Math.max(0, custIdx - 10), custIdx + 10);
  }

  // Find Tag Width / Tag Length
  const widthIdx = tokens.findIndex(t => t.includes('Tag Width'));
  if (widthIdx !== -1) {
    result['TagWidth_context'] = tokens.slice(Math.max(0, widthIdx - 10), widthIdx + 20);
  }

  // Find Material
  const matIdx = tokens.findIndex(t => t.includes('Material Type:') || t.includes('Material Desc:') || t.includes('Material:'));
  if (matIdx !== -1) {
    result['Material_context'] = tokens.slice(Math.max(0, matIdx - 5), matIdx + 20);
  }

  // Find Colors
  const frontColIdx = tokens.findIndex(t => t.includes('Front Colors') || t.includes('Color / PMS#'));
  if (frontColIdx !== -1) {
    result['Colors_context'] = tokens.slice(Math.max(0, frontColIdx - 5), frontColIdx + 25);
  }

  // Find Notes
  const notesIdx = tokens.findIndex(t => t.includes('Special Notes:') || t.includes('Manufacturing Notes'));
  if (notesIdx !== -1) {
    result['Notes_context'] = tokens.slice(Math.max(0, notesIdx - 5), notesIdx + 15);
  }

  return result;
}

const items = ['2-539037-000-00', '2-550615-052-00', '2-555714-000-01'];
for (const it of items) {
  const tokens = JSON.parse(fs.readFileSync(`c:/Users/1221390/Desktop/Agent double check new item/downloads/${it}_ordered_tokens.json`));
  console.log(`\n============================ ${it} ============================`);
  console.log(JSON.stringify(findFieldValues(tokens), null, 2));
}

