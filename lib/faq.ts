export const TRIAL_DAYS = 7
export const PAID_PRICE_USD = 29

export const FAQ_ITEMS = [
  {
    question: 'What is Backer Sonar?',
    answer:
      'A research workspace for evaluating historical Kickstarter campaign data before deciding what to launch. It replaces guesswork with source-linked campaign history, explicit filters, and reproducible calculations.',
  },
  {
    question: 'What data does Backer Sonar use?',
    answer:
      'The full Kickstarter dataset (Web Robots Kickstarter Dataset), with money values normalized to USD and campaigns classified into a product taxonomy beyond Kickstarter’s own category labels. Curated research workflows currently focus on TTRPG, with more categories planned.',
  },
  {
    question: 'How much does it cost?',
    answer: `$${PAID_PRICE_USD}/month after a ${TRIAL_DAYS}-day free trial, no credit card required to start.`,
  },
  {
    question: 'Is the analysis AI-generated?',
    answer:
      'No. Core research, reporting, and comparisons are deterministic calculations from source data — the same inputs always produce the same numbers. An optional AI Co-Pilot (included with Paid) can narrate saved research in plain language, but it never invents numbers or predicts campaign outcomes.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. Cancelling keeps full access through the period you already paid for, with no refund for the remaining time.',
  },
]
