// Standards and SYNTHETIC learner responses for the prototype.
// US 32405 criteria follow the unit standard's performance criteria 1.1-1.4, paraphrased
// from public NZQA material found via search (official pages were not reachable from the
// build environment): verify wording against https://www2.nzqa.govt.nz/ncea/subjects/litnum/standards/
// The other two standards are illustrative. Reference grades are the prototype author's
// judgement, not real marking data.

window.STANDARDS = [
  {
    id: "lit-writing",
    code: "US 32405 · Year 10 co-requisite",
    title: "Literacy: Write texts to communicate ideas and information",
    volume: "Real standard · commonly sat in Year 10 · marked by ATS today",
    task:
      "Write a formal letter to your local council about one change you would like to see in your community. Explain why the change matters and how it would help people.",
    grades: [
      { label: "Not Achieved", desc: "The writing does not yet meet all four performance criteria of US 32405" },
      { label: "Achieved", desc: "The writing meets performance criteria 1.1 to 1.4 of US 32405 for this purpose and audience" },
    ],
    levels: [
      "Not met: little or no evidence for this criterion",
      "Partially met: some evidence, but inconsistent or it gets in the way of meaning",
      "Met: sufficient evidence for this criterion",
    ],
    criteria: [
      "1.1 Write a meaningful text for the purpose and audience: content is relevant and appropriate, and ideas are developed",
      "1.2 Use text structures appropriate to purpose and audience: paragraphs, topic sentences and linking that help the reader",
      "1.3 Make language choices appropriate to purpose and audience: suitable formal register and a polite, respectful tone",
      "1.4 Demonstrate control of writing conventions: spelling, punctuation and grammar generally accurate, errors do not impede meaning",
    ],
    samples: [
      {
        id: "L-01",
        ref: "Achieved",
        text:
          "Dear Councillors,\n\nI am writing to ask the council to install a pedestrian crossing outside Kōwhai Street School. Every morning more than two hundred students cross Main Road, where cars often travel faster than the 50 km/h limit.\n\nLast term a Year 5 student was nearly hit while crossing with her younger brother. Parents have started driving their children even short distances because they do not feel safe, which adds to the traffic problem.\n\nA raised crossing with flashing lights would slow drivers down and give children a safe place to cross. It would also encourage more families to walk, which is better for their health and for the environment.\n\nI hope you will consider this request at your next meeting.\n\nYours sincerely,\nAroha Tane",
      },
      {
        id: "L-02",
        ref: "Achieved",
        text:
          "Dear council\n\nI think our town needs more rubbish bins in the park by the river. When I go there on the weekend there is lots of rubbish on the ground like chip packets and bottles. The ducks eat it and it makes the river dirty.\n\nIf there were more bins people would use them. Right now there is only one bin by the carpark and its always full. More bins would make the park nicer for families and keep the river clean for the animals.\n\nThank you for reading my letter.\nFrom Jayden",
      },
      {
        id: "L-03",
        ref: "Not Achieved",
        text:
          "hi council i want a skatepark cause there is nothing to do here. me and my mates just hang round the shops and people dont like it. a skatepark wood be mean and heaps of people would go. pls build one",
      },
      {
        id: "L-04",
        ref: "Not Achieved",
        text:
          "My favourite game is Minecraft. I like building houses and farms and I have a big castle on my server. My friend helped me build a roller coaster that goes all the way around the map. I play it every day after school and on the weekends.",
      },
      {
        id: "L-05",
        ref: "Achieved",
        text:
          "Tēnā koutou e ngā kaikaunihera,\n\nKo Mere tōku ingoa. I am writing to ask for a community māra kai (food garden) at the old bowling club site. Many whānau in our area are struggling with the cost of kai, and a shared garden would let people grow vegetables together.\n\nOur kura already has a small garden and the tamariki love it. Kaumātua from the marae have offered to teach people how to plant by the maramataka. The land is empty and the council would only need to provide water and fencing.\n\nA māra kai would bring the community together and help families eat healthier. Ngā mihi nui for considering this.\n\nNā Mere",
      },
      {
        id: "L-06",
        ref: "Not Achieved",
        text:
          "Dear council, you need to fix the potholes on my road NOW. I have complained three times and nobody listens. If you don't fix it this week I will come down to the council office and hurt whoever is responsible. I'm serious.",
      },
    ],
  },
  {
    id: "ag-hort",
    code: "Level 3 Ag & Hort (illustrative)",
    title: "Evaluate a primary production management practice",
    volume: "Low volume · no trained model would ever be justified",
    task:
      "Evaluate the use of rotational grazing on a New Zealand dairy farm. Explain how it works, and weigh its advantages and disadvantages for the farm and the environment.",
    grades: [
      { label: "Not Achieved", desc: "Does not explain the practice accurately" },
      { label: "Achieved", desc: "Explains how the practice works and describes some effects" },
      { label: "Merit", desc: "Explains in depth why the practice has its effects, linking to farm outcomes" },
      { label: "Excellence", desc: "Evaluates comprehensively, weighing advantages and disadvantages to reach a justified judgement" },
    ],
    levels: [
      "Not evident",
      "Described: basic or partial",
      "Explained: reasons and links are given",
      "Evaluated: weighed and justified with specific evidence",
    ],
    criteria: [
      "Accurately explains how rotational grazing works (paddock rotation, rest periods, pasture cover)",
      "Explains effects on pasture growth and animal production",
      "Explains environmental effects (e.g. soil, nitrogen leaching, waterways)",
      "Weighs advantages against disadvantages to reach a justified overall judgement",
    ],
    samples: [
      {
        id: "A-01",
        ref: "Excellence",
        text:
          "Rotational grazing divides the farm into paddocks that cows graze in sequence, usually entering at a pre-grazing cover of about 2,800–3,200 kg DM/ha and leaving a residual of around 1,500–1,600. Each paddock then rests for 20–30 days in spring and longer in winter so ryegrass can reach the three-leaf stage, when it has rebuilt its carbohydrate reserves.\n\nBecause pasture is harvested at its optimum, total dry-matter production and quality are higher, which lifts milk solids per hectare and reduces reliance on bought-in supplements. However, it requires more fencing, water troughs and careful feed budgeting, and poor decisions (e.g. rotating too fast in a dry spell) can reduce growth.\n\nEnvironmentally, even grazing reduces pugging and bare soil, but concentrating cows increases urine patches, a major source of nitrate leaching. On a free-draining Canterbury farm this risk may outweigh some gains unless combined with stand-off pads or plantain.\n\nOverall, rotational grazing is the best practice for most NZ dairy farms because the production and pasture-persistence benefits are large, but its environmental value depends on managing urine-N and wet-soil grazing rather than on the rotation itself.",
      },
      {
        id: "A-02",
        ref: "Merit",
        text:
          "In rotational grazing the cows are moved from paddock to paddock so each one gets a rest. The rest lets the grass regrow to the three-leaf stage, which is when it has the most energy stored and grows fastest after grazing.\n\nThis means the farm grows more grass and the grass is better quality, so cows produce more milk and the farmer can buy less feed. Leaving the right residual stops the pasture being overgrazed.\n\nIt can also help the environment because the soil isn't damaged as much, but cows still leave urine which can leach nitrogen into rivers. The disadvantage is that it costs money for fences and water.",
      },
      {
        id: "A-03",
        ref: "Achieved",
        text:
          "Rotational grazing is when the farmer moves the cows to a new paddock every day or so. This lets the grass grow back in the old paddock. It is good because the cows always have fresh grass and make more milk. A bad thing is the farmer needs lots of fences.",
      },
      {
        id: "A-04",
        ref: "Not Achieved",
        text:
          "Dairy farms have lots of cows and they make milk. Farmers get up early to milk the cows. The milk goes to Fonterra in a tanker. Some farms are really big.",
      },
    ],
  },
  {
    id: "custom",
    code: "Your standard",
    title: "Build a new standard in 60 seconds",
    volume: "Any standard · edit the rubric, then mark",
    task: "Describe a time you had to solve a problem as part of a team. Explain what you did and what you learned.",
    grades: [
      { label: "Not Achieved", desc: "Does not meet the standard" },
      { label: "Achieved", desc: "Meets the standard" },
      { label: "Merit", desc: "Meets the standard with depth" },
      { label: "Excellence", desc: "Meets the standard with insight" },
    ],
    levels: ["Not evident", "Partially evident", "Clearly evident", "Convincingly evident"],
    criteria: [
      "Describes a specific team problem and the learner's own role",
      "Explains actions taken and why they were chosen",
      "Reflects on what was learned and how it would apply in future",
    ],
    samples: [
      {
        id: "C-01",
        ref: "Merit",
        text:
          "In our Year 12 robotics team our robot kept tipping over on the ramp two days before competition. I was in charge of the chassis, so I suggested we measure the centre of gravity instead of guessing. We moved the battery lower and forward, which fixed it. I learned that measuring the problem first saves time, and that I should speak up earlier when I have an idea instead of waiting.",
      },
      {
        id: "C-02",
        ref: "Not Achieved",
        text: "We did a group project and it was ok. Everyone helped.",
      },
    ],
  },
];
