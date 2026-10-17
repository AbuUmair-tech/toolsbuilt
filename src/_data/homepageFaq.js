const site = require('./site.json');

module.exports = function() {
  let authorAnswer;
  if (!site.authorName || site.authorName.includes('TODO_')) {
    console.warn('⚠️  [WARN] site.json author fields contain TODO placeholders. Rendering neutral "ToolsBuilt editorial team" in homepage FAQ.');
    authorAnswer = 'ToolsBuilt is designed, developed, and maintained by the ToolsBuilt editorial team—independent software engineers and designers dedicated to building fast, accessible, privacy-first web utilities with zero trackers or subscriptions.';
  } else {
    authorAnswer = `ToolsBuilt is designed, developed, and maintained by ${site.authorName}${site.authorBio ? '—' + site.authorBio : ''}.`;
  }

  return [
    {
      question: "Is ToolsBuilt really free to use?",
      answer: "Yes, 100% free with no hidden fees, tiered paywalls, or subscription traps. Every calculator and web utility is accessible to everyone without limits."
    },
    {
      question: "Do you store or log my calculation data?",
      answer: "Never. All calculations run strictly inside your browser using client-side JavaScript. Your inputs, generated passwords, and numerical data never leave your device and are never transmitted to our servers."
    },
    {
      question: "Do these tools work offline?",
      answer: "Yes. Once a tool page is loaded in your browser, all calculation logic runs locally. You can calculate ages, count text, generate passwords, and perform date arithmetic even if your internet connection drops."
    },
    {
      question: "How accurate are the calculators?",
      answer: "All calculators are rigorously verified against standard mathematical models, astronomical calendar rules (such as leap years and Gregorian calendar boundaries), and financial rounding standards. The underlying formulas and logic are transparently documented on every tool page."
    },
    {
      question: "Can I suggest a new calculator or feature?",
      answer: "Absolutely! We actively welcome feedback and utility suggestions. You can reach out directly via our Contact page to suggest a new tool or improvement."
    },
    {
      question: "Who builds and maintains ToolsBuilt?",
      answer: authorAnswer
    }
  ];
};
