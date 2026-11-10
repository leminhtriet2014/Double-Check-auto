const { Pipeline } = require('./engine/pipeline');
const path = require('path');
const fs = require('fs');

const args = process.argv.slice(2);
let targetItem = null;
let targetFolder = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--item' && args[i + 1]) {
    targetItem = args[i + 1];
    i++;
  } else if (args[i] === '--folder' && args[i + 1]) {
    targetFolder = args[i + 1];
    i++;
  } else if (!args[i].startsWith('--')) {
    const val = args[i];
    if (val.match(/^[12]-\d{6}-\d{3}-\d{2}$/)) {
      targetItem = val;
    } else {
      targetFolder = val;
    }
  }
}

if (!targetItem && !targetFolder) {
  targetFolder = '07-Nov'; // default
}

console.log(`\n======================================================`);
console.log(`  AVERY DENNISON QA DOUBLE CHECK TOOL (CLI)`);
if (targetItem) {
  console.log(`  Mode: Single Item Realtime Check`);
  console.log(`  Target Item: ${targetItem}`);
} else {
  console.log(`  Mode: Folder Batch Check`);
  console.log(`  Target Folder: ${targetFolder}`);
}
console.log(`======================================================\n`);

const pipeline = new Pipeline();

(async () => {
  try {
    if (targetItem) {
      const reportsDir = path.resolve(__dirname, '../reports/single_checks');
      await pipeline.browserManager.connect();
      const res = await pipeline.checkSingleItem(targetItem, reportsDir, (evt) => {
        console.log(`[PROGRESS] ${evt.message}`);
      });
      console.log(`\n======================================================`);
      console.log(`  CHECK COMPLETE FOR: ${res.glid} (${res.itemCode})`);
      console.log(`  Status       : ${res.status}`);
      console.log(`  Spec Found   : ${res.specName}`);
      console.log(`  Report Card  : ${res.reportImage}`);
      console.log(`  ItemMaster   : ${res.itemMasterScreen}`);
      console.log(`  Drive Search : ${res.searchScreen}`);
      console.log(`======================================================\n`);
      await pipeline.browserManager.disconnect();
    } else {
      const res = await pipeline.runFolder(targetFolder, (evt) => {
        console.log(`[PROGRESS] ${evt.message}`);
      });
      console.log(`\n======================================================`);
      console.log(`  DOUBLE CHECK COMPLETE!`);
      console.log(`  Total Items : ${res.results.length}`);
      console.log(`  Report HTML : ${res.htmlReportPath}`);
      console.log(`======================================================\n`);
    }
    process.exit(0);
  } catch (err) {
    console.error(`\nPipeline execution failed:`, err);
    process.exit(1);
  }
})();
