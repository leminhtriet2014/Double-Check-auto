const fs = require('fs');
const path = require('path');

class LeadtimeCalculator {
  constructor(rulesPath) {
    const p = rulesPath || path.resolve(__dirname, '../config/leadtime_rules.json');
    const content = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '');
    this.rules = JSON.parse(content);
    this.rulesMap = {};
    for (const r of this.rules) {
      if (r.code) this.rulesMap[r.code.toUpperCase()] = r;
    }
  }

  calculate(processString, extraTime = 0, waitingDrying = 0) {
    const baseCodes = ['ML', 'PM', 'PC', 'PR', 'VA', 'DC', 'PS', 'SG', 'PV'];
    let baseDays = 7;
    const secondaryList = [];

    if (!processString) {
      return {
        baseDays: 7,
        secondaryProcesses: [],
        extraTime: Number(extraTime) || 0,
        totalDays: 7 + (Number(extraTime) || 0),
        explanation: 'Routing cơ bản (7 ngày)'
      };
    }

    // Extract all step codes
    // Matches patterns like "01ML", "06S4", "07DC" or space-separated codes
    const stepMatches = processString.match(/\d{2}([A-Z0-9]{2})/g) || [];
    const codes = stepMatches.map(s => s.slice(2).toUpperCase());

    for (const code of codes) {
      if (!baseCodes.includes(code)) {
        const rule = this.rulesMap[code];
        if (rule) {
          secondaryList.push({
            code: rule.code,
            name: rule.description || rule.process,
            category: rule.category,
            days: rule.leadtime || 0
          });
        } else {
          // Unknown or custom secondary code
          secondaryList.push({
            code,
            name: `Công đoạn phụ ${code}`,
            days: 1
          });
        }
      }
    }

    const secondaryDays = secondaryList.reduce((sum, item) => sum + item.days, 0);
    const extraDays = (Number(extraTime) || 0) + (Number(waitingDrying) || 0);
    const totalDays = baseDays + secondaryDays + extraDays;

    let explanation = `7 ngày cơ bản`;
    if (secondaryList.length > 0) {
      const details = secondaryList.map(s => `${s.days} ngày (${s.code}: ${s.name})`).join(', ');
      explanation += ` + ${details}`;
    }
    if (extraDays > 0) {
      explanation += ` + ${extraDays} ngày (Extra time / Chờ khô)`;
    }
    explanation += ` = ${totalDays} ngày`;

    return {
      baseDays,
      secondaryProcesses: secondaryList,
      extraTime: extraDays,
      totalDays,
      explanation
    };
  }
}

module.exports = { LeadtimeCalculator };
