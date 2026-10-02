import { QuestionItem } from '../types';

export const QUESTIONS_POOL: QuestionItem[] = [
  // Page 1
  { id: 1, position: 1, text: "I feel comfortable around people and make friends easily.", factorCode: "A", reverseKeyed: false },
  { id: 2, position: 2, text: "I enjoy solving complex theoretical problems and abstract puzzles.", factorCode: "B", reverseKeyed: false },
  { id: 3, position: 3, text: "I rarely get irritated or lose my temper when things go wrong.", factorCode: "C", reverseKeyed: false },
  { id: 4, position: 4, text: "I take charge and naturally influence group decisions.", factorCode: "E", reverseKeyed: false },
  { id: 5, position: 5, text: "I am full of energy, spontaneous, and enjoy lively gatherings.", factorCode: "F", reverseKeyed: false },
  { id: 6, position: 6, text: "I believe in sticking strictly to established rules and procedures.", factorCode: "G", reverseKeyed: false },
  { id: 7, position: 7, text: "I feel confident speaking in front of large unfamiliar audiences.", factorCode: "H", reverseKeyed: false },

  // Page 2
  { id: 8, position: 8, text: "I am deeply moved by music, poetry, and artistic beauty.", factorCode: "I", reverseKeyed: false },
  { id: 9, position: 9, text: "I tend to question people's hidden motives before trusting them.", factorCode: "L", reverseKeyed: false },
  { id: 10, position: 10, text: "I spend a lot of time daydreaming and pondering philosophical ideas.", factorCode: "M", reverseKeyed: false },
  { id: 11, position: 11, text: "I prefer keeping my personal feelings and private life to myself.", factorCode: "N", reverseKeyed: false },
  { id: 12, position: 12, text: "I frequently worry about mistakes I might have made in the past.", factorCode: "O", reverseKeyed: false },
  { id: 13, position: 13, text: "I welcome change and enjoy experimenting with novel approaches.", factorCode: "Q1", reverseKeyed: false },
  { id: 14, position: 14, text: "I prefer working alone rather than being dependent on a team.", factorCode: "Q2", reverseKeyed: false },

  // Page 3
  { id: 15, position: 15, text: "I always keep my workspace organized and follow a strict schedule.", factorCode: "Q3", reverseKeyed: false },
  { id: 16, position: 16, text: "I often feel a sense of internal urgency and impatience to get things done.", factorCode: "Q4", reverseKeyed: false },
  { id: 17, position: 17, text: "I keep a polite emotional distance from strangers and acquaintances.", factorCode: "A", reverseKeyed: true },
  { id: 18, position: 18, text: "I prefer tangible, practical tasks over abstract theoretical models.", factorCode: "B", reverseKeyed: true },
  { id: 19, position: 19, text: "Unexpected obstacles easily cause me stress and frustration.", factorCode: "C", reverseKeyed: true },
  { id: 20, position: 20, text: "I prefer accommodating others rather than asserting my own authority.", factorCode: "E", reverseKeyed: true },
  { id: 21, position: 21, text: "I am cautious, serious, and think carefully before I speak.", factorCode: "F", reverseKeyed: true },

  // Page 4
  { id: 22, position: 22, text: "I am willing to bend rules if it helps achieve a practical outcome.", factorCode: "G", reverseKeyed: true },
  { id: 23, position: 23, text: "I feel shy or awkward when meeting influential new people.", factorCode: "H", reverseKeyed: true },
  { id: 24, position: 24, text: "I focus on logical utility and rarely get swayed by sentimental appeals.", factorCode: "I", reverseKeyed: true },
  { id: 25, position: 25, text: "I naturally assume people have good intentions unless proven otherwise.", factorCode: "L", reverseKeyed: true },
  { id: 26, position: 26, text: "I stay grounded in concrete realities rather than imaginary scenarios.", factorCode: "M", reverseKeyed: true },
  { id: 27, position: 27, text: "I am an open book and talk openly about my life and experiences.", factorCode: "N", reverseKeyed: true },
  { id: 28, position: 28, text: "I rarely feel guilty or worry about what others think of me.", factorCode: "O", reverseKeyed: true },

  // Page 5
  { id: 29, position: 29, text: "I value time-tested traditions and proven methods over unproven trends.", factorCode: "Q1", reverseKeyed: true },
  { id: 30, position: 30, text: "I thrive on group discussions and consensus-driven decision making.", factorCode: "Q2", reverseKeyed: true },
  { id: 31, position: 31, text: "I am comfortable with a little disorder and prefer spontaneous flexibility.", factorCode: "Q3", reverseKeyed: true },
  { id: 32, position: 32, text: "I am usually relaxed, unhurried, and patient in stressful moments.", factorCode: "Q4", reverseKeyed: true },
  { id: 33, position: 33, text: "I show genuine interest in other people's lives and personal stories.", factorCode: "A", reverseKeyed: false },
  { id: 34, position: 34, text: "I quickly understand difficult conceptual analogies and symbolic relationships.", factorCode: "B", reverseKeyed: false },
  { id: 35, position: 35, text: "To verify your attention to this questionnaire, please choose 'Agree'.", isAttentionCheck: true, expectedAnswer: 4, reverseKeyed: false },

  // Page 6
  { id: 36, position: 36, text: "My mood remains consistent even during difficult weeks.", factorCode: "C", reverseKeyed: false },
  { id: 37, position: 37, text: "I stand my ground firmly during competitive negotiations.", factorCode: "E", reverseKeyed: false },
  { id: 38, position: 38, text: "I bring enthusiasm, laughter, and high energy into a room.", factorCode: "F", reverseKeyed: false },
  { id: 39, position: 39, text: "I feel a strong moral duty to honor all social and professional commitments.", factorCode: "G", reverseKeyed: false },
  { id: 40, position: 40, text: "I am bold in initiating conversations with people I have never met.", factorCode: "H", reverseKeyed: false },
  { id: 41, position: 41, text: "I am sensitive to the subtle emotional atmosphere around me.", factorCode: "I", reverseKeyed: false },
  { id: 42, position: 42, text: "I stay alert to the possibility that others might take advantage of me.", factorCode: "L", reverseKeyed: false },

  // Page 7
  { id: 43, position: 43, text: "I frequently come up with novel, unconventional concepts.", factorCode: "M", reverseKeyed: false },
  { id: 44, position: 44, text: "I maintain a private boundary and rarely disclose my inner vulnerabilities.", factorCode: "N", reverseKeyed: false },
  { id: 45, position: 45, text: "I tend to dwell on critical remarks made about my performance.", factorCode: "O", reverseKeyed: false },
  { id: 46, position: 46, text: "I actively seek out modern tools and innovative methodologies.", factorCode: "Q1", reverseKeyed: false },
  { id: 47, position: 47, text: "I make my best decisions when thinking in solitude without interruption.", factorCode: "Q2", reverseKeyed: false },
  { id: 48, position: 48, text: "I double-check my work meticulously to ensure precision and accuracy.", factorCode: "Q3", reverseKeyed: false },
  { id: 49, position: 49, text: "I find it hard to sit still when tasks remain unfinished.", factorCode: "Q4", reverseKeyed: false },

  // Page 8
  { id: 50, position: 50, text: "I am affectionate and warm when greeting friends and colleagues.", factorCode: "A", reverseKeyed: false },
  { id: 51, position: 51, text: "I enjoy reading dense analytical or philosophical material.", factorCode: "B", reverseKeyed: false },
  { id: 52, position: 52, text: "I recover quickly from emotional shocks or disappointment.", factorCode: "C", reverseKeyed: false },
  { id: 53, position: 53, text: "I am comfortable giving directions and holding others accountable.", factorCode: "E", reverseKeyed: false },
  { id: 54, position: 54, text: "I enjoy being the center of attention during celebrations.", factorCode: "F", reverseKeyed: false },
  { id: 55, position: 55, text: "I place high value on honesty, civic duty, and integrity.", factorCode: "G", reverseKeyed: false },
  { id: 56, position: 56, text: "I am fearless when walking into unfamiliar social gatherings.", factorCode: "H", reverseKeyed: false },

  // Page 9
  { id: 57, position: 57, text: "I am moved to tears by poignant stories or artistic expression.", factorCode: "I", reverseKeyed: false },
  { id: 58, position: 58, text: "I remain vigilant about potential conflicts of interest.", factorCode: "L", reverseKeyed: false },
  { id: 59, position: 59, text: "I get lost in my own thoughts even in bustling environments.", factorCode: "M", reverseKeyed: false },
  { id: 60, position: 60, text: "I choose my words deliberately to avoid oversharing personal matters.", factorCode: "N", reverseKeyed: false },
  { id: 61, position: 61, text: "I am prone to feeling inadequate when compared to high achievers.", factorCode: "O", reverseKeyed: false },
  { id: 62, position: 62, text: "I enjoy breaking away from habitual routines and exploring new paths.", factorCode: "Q1", reverseKeyed: false },
  { id: 63, position: 63, text: "I rely on my own judgment rather than seeking constant validation.", factorCode: "Q2", reverseKeyed: false },

  // Page 10
  { id: 64, position: 64, text: "I create detailed plans before starting any significant project.", factorCode: "Q3", reverseKeyed: false },
  { id: 65, position: 65, text: "I experience physical tension or restlessness when waiting for results.", factorCode: "Q4", reverseKeyed: false },
  { id: 66, position: 66, text: "I find it tiring to engage in casual small talk with strangers.", factorCode: "A", reverseKeyed: true },
  { id: 67, position: 67, text: "I find complex theoretical debates somewhat tedious and ungrounded.", factorCode: "B", reverseKeyed: true },
  { id: 68, position: 68, text: "I feel easily overwhelmed when multiple demands occur at once.", factorCode: "C", reverseKeyed: true },
  { id: 69, position: 69, text: "I would rather follow someone else's lead than dictate the agenda.", factorCode: "E", reverseKeyed: true },
  { id: 70, position: 70, text: "I am naturally subdued and speak with quiet moderation.", factorCode: "F", reverseKeyed: true },

  // Page 11
  { id: 71, position: 71, text: "I believe rules should be adapted flexibly based on circumstances.", factorCode: "G", reverseKeyed: true },
  { id: 72, position: 72, text: "I hesitate to speak up in large meetings with senior executives.", factorCode: "H", reverseKeyed: true },
  { id: 73, position: 73, text: "I make decisions purely on empirical evidence and hard numbers.", factorCode: "I", reverseKeyed: true },
  { id: 74, position: 74, text: "I am quick to forgive and rarely suspect ill intent in others.", factorCode: "L", reverseKeyed: true },
  { id: 75, position: 75, text: "I focus primarily on immediate observable facts rather than theories.", factorCode: "M", reverseKeyed: true },
  { id: 76, position: 76, text: "I readily express my spontaneous reactions and unfiltered opinions.", factorCode: "N", reverseKeyed: true },
  { id: 77, position: 77, text: "I rarely worry about future uncertainties or past shortcomings.", factorCode: "O", reverseKeyed: true },

  // Page 12
  { id: 78, position: 78, text: "I prefer established conventions and respect traditional authority.", factorCode: "Q1", reverseKeyed: true },
  { id: 79, position: 79, text: "I enjoy belonging to clubs, teams, and active social communities.", factorCode: "Q2", reverseKeyed: true },
  { id: 80, position: 80, text: "I dislike rigid schedules and prefer working in creative bursts.", factorCode: "Q3", reverseKeyed: true },
  { id: 81, position: 81, text: "I am calm, tranquil, and rarely feel a sense of hurried panic.", factorCode: "Q4", reverseKeyed: true },
  { id: 82, position: 82, text: "I am readily available when someone needs a compassionate listener.", factorCode: "A", reverseKeyed: false },
  { id: 83, position: 83, text: "I enjoy dissecting the underlying mechanics of complicated systems.", factorCode: "B", reverseKeyed: false },
  { id: 84, position: 84, text: "To confirm that you are reading each item, please select 'Neutral'.", isAttentionCheck: true, expectedAnswer: 3, reverseKeyed: false },

  // Page 13
  { id: 85, position: 85, text: "I remain composed and steady during interpersonal disagreements.", factorCode: "C", reverseKeyed: false },
  { id: 86, position: 86, text: "I readily express disagreement even when in the minority.", factorCode: "E", reverseKeyed: false },
  { id: 87, position: 87, text: "I enjoy entertaining others and sparking laughter in conversations.", factorCode: "F", reverseKeyed: false },
  { id: 88, position: 88, text: "I take pride in strictly honoring my promises without excuses.", factorCode: "G", reverseKeyed: false },
  { id: 89, position: 89, text: "I enjoy stepping into high-visibility leadership roles.", factorCode: "H", reverseKeyed: false },
  { id: 90, position: 90, text: "I am sensitive to subtle aesthetic details in architecture and art.", factorCode: "I", reverseKeyed: false },
  { id: 91, position: 91, text: "I am cautious about sharing proprietary ideas with new acquaintances.", factorCode: "L", reverseKeyed: false },

  // Page 14
  { id: 92, position: 92, text: "I find conceptual brainstorming more thrilling than repetitive execution.", factorCode: "M", reverseKeyed: false },
  { id: 93, position: 93, text: "I keep a guarded stance regarding my personal financial matters.", factorCode: "N", reverseKeyed: false },
  { id: 94, position: 94, text: "I experience self-doubt when undertaking unfamiliar challenges.", factorCode: "O", reverseKeyed: false },
  { id: 95, position: 95, text: "I enjoy questioning longstanding dogma and cultural assumptions.", factorCode: "Q1", reverseKeyed: false },
  { id: 96, position: 96, text: "I prefer solving problems independently before consulting others.", factorCode: "Q2", reverseKeyed: false },
  { id: 97, position: 97, text: "I maintain tidy folders, files, and physical possessions.", factorCode: "Q3", reverseKeyed: false },
  { id: 98, position: 98, text: "I feel irritated when people work at a sluggish or leisurely pace.", factorCode: "Q4", reverseKeyed: false },

  // Page 15
  { id: 99, position: 99, text: "I make people feel instantly welcomed and appreciated.", factorCode: "A", reverseKeyed: false },
  { id: 100, position: 100, text: "I grasp abstract mathematical or logical principles quickly.", factorCode: "B", reverseKeyed: false },
  { id: 101, position: 101, text: "I maintain steady emotional equilibrium through life's ups and downs.", factorCode: "C", reverseKeyed: false },
  { id: 102, position: 102, text: "I am direct and assertive when asking for what I need.", factorCode: "E", reverseKeyed: false },
  { id: 103, position: 103, text: "I enjoy lively social gatherings, parties, and vibrant events.", factorCode: "F", reverseKeyed: false },
  { id: 104, position: 104, text: "I strictly observe safety codes, ethics, and legal requirements.", factorCode: "G", reverseKeyed: false },
  { id: 105, position: 105, text: "I have no difficulty approaching high-profile leaders or dignitaries.", factorCode: "H", reverseKeyed: false },

  // Page 16
  { id: 106, position: 106, text: "I consider the emotional impact on individuals before making policies.", factorCode: "I", reverseKeyed: false },
  { id: 107, position: 107, text: "I scrutinize contracts and agreements very carefully for hidden traps.", factorCode: "L", reverseKeyed: false },
  { id: 108, position: 108, text: "I am fascinated by abstract metaphors and speculative possibilities.", factorCode: "M", reverseKeyed: false },
  { id: 109, position: 109, text: "I maintain a formal and reserved demeanor in professional settings.", factorCode: "N", reverseKeyed: false },
  { id: 110, position: 110, text: "I tend to replay awkward social interactions repeatedly in my mind.", factorCode: "O", reverseKeyed: false },
  { id: 111, position: 111, text: "I am enthusiastic about adopting new software tools and technologies.", factorCode: "Q1", reverseKeyed: false },
  { id: 112, position: 112, text: "I feel self-sufficient and rarely seek reassurance from others.", factorCode: "Q2", reverseKeyed: false },

  // Page 17
  { id: 113, position: 113, text: "I follow methodical checklists to ensure zero omissions.", factorCode: "Q3", reverseKeyed: false },
  { id: 114, position: 114, text: "I find myself feeling tense and on-edge when deadlines loom near.", factorCode: "Q4", reverseKeyed: false },
  { id: 115, position: 115, text: "I am detached and objective when dealing with colleagues.", factorCode: "A", reverseKeyed: true },
  { id: 116, position: 116, text: "I prefer practical step-by-step instructions over theoretical explanations.", factorCode: "B", reverseKeyed: true },
  { id: 117, position: 117, text: "I can become discouraged when faced with sustained criticism.", factorCode: "C", reverseKeyed: true },
  { id: 118, position: 118, text: "I yield easily to the preferences of dominant group members.", factorCode: "E", reverseKeyed: true },
  { id: 119, position: 119, text: "I prefer quiet, reflective evenings over noisy parties.", factorCode: "F", reverseKeyed: true },

  // Page 18
  { id: 120, position: 120, text: "I am willing to bypass formal channels to get things done faster.", factorCode: "G", reverseKeyed: true },
  { id: 121, position: 121, text: "I feel nervous when called upon to speak without preparation.", factorCode: "H", reverseKeyed: true },
  { id: 122, position: 122, text: "I am unsentimental and focus strictly on bottom-line results.", factorCode: "I", reverseKeyed: true },
  { id: 123, position: 123, text: "I believe that most people are inherently trustworthy and fair.", factorCode: "L", reverseKeyed: true },
  { id: 124, position: 124, text: "I stay focused on immediate practical details rather than abstract visions.", factorCode: "M", reverseKeyed: true },
  { id: 125, position: 125, text: "I readily share my thoughts and feelings with anyone interested.", factorCode: "N", reverseKeyed: true },
  { id: 126, position: 126, text: "I have unshakable confidence in my capabilities and judgment.", factorCode: "O", reverseKeyed: true },

  // Page 19
  { id: 127, position: 127, text: "I prefer staying with familiar brands and customary routines.", factorCode: "Q1", reverseKeyed: true },
  { id: 128, position: 128, text: "I find working in collaborative teams far more motivating than working alone.", factorCode: "Q2", reverseKeyed: true },
  { id: 129, position: 129, text: "I prefer an adaptable, informal workflow over rigid schedules.", factorCode: "Q3", reverseKeyed: true },
  { id: 130, position: 130, text: "I have a patient, calm disposition and rarely experience anxiety.", factorCode: "Q4", reverseKeyed: true },
  { id: 131, position: 131, text: "I enjoy building deep, supportive relationships with teammates.", factorCode: "A", reverseKeyed: false },
  { id: 132, position: 132, text: "I enjoy synthesizing disparate data streams into comprehensive theories.", factorCode: "B", reverseKeyed: false },
  { id: 133, position: 133, text: "To ensure full attention to this test, please select 'Strongly Agree'.", isAttentionCheck: true, expectedAnswer: 5, reverseKeyed: false },

  // Page 20
  { id: 134, position: 134, text: "I maintain a calm, reassuring presence during organizational crises.", factorCode: "C", reverseKeyed: false },
  { id: 135, position: 135, text: "I am comfortable confronting difficult behavior directly.", factorCode: "E", reverseKeyed: false },
  { id: 136, position: 136, text: "I bring optimism and cheerfulness to challenging projects.", factorCode: "F", reverseKeyed: false },
  { id: 137, position: 137, text: "I strictly follow ethical principles even when no one is watching.", factorCode: "G", reverseKeyed: false },
  { id: 138, position: 138, text: "I thrive in competitive pitches and public speaking appearances.", factorCode: "H", reverseKeyed: false },
  { id: 139, position: 139, text: "I value intuitive insight and emotional sensitivity.", factorCode: "I", reverseKeyed: false },
  { id: 140, position: 140, text: "I am mindful of competitive threats and hidden risks.", factorCode: "L", reverseKeyed: false },

  // Page 21
  { id: 141, position: 141, text: "I enjoy brainstorming futuristic, disruptive ideas.", factorCode: "M", reverseKeyed: false },
  { id: 142, position: 142, text: "I guard my personal reflections and keep a professional boundary.", factorCode: "N", reverseKeyed: false },
  { id: 143, position: 143, text: "I hold myself to demanding standards and feel remorse if I fall short.", factorCode: "O", reverseKeyed: false },
  { id: 144, position: 144, text: "I enjoy challenging obsolete traditions and testing modern methods.", factorCode: "Q1", reverseKeyed: false },
  { id: 145, position: 145, text: "I am comfortable making significant decisions without group consensus.", factorCode: "Q2", reverseKeyed: false },
  { id: 146, position: 146, text: "I take great satisfaction in completing projects with meticulous perfection.", factorCode: "Q3", reverseKeyed: false },
  { id: 147, position: 147, text: "I feel a restless drive to accomplish my goals immediately.", factorCode: "Q4", reverseKeyed: false },

  // Page 22
  { id: 148, position: 148, text: "I form warm and genuine connections with people from all walks of life.", factorCode: "A", reverseKeyed: false },
  { id: 149, position: 149, text: "I enjoy exploring multifaceted intellectual puzzles.", factorCode: "B", reverseKeyed: false },
  { id: 150, position: 150, text: "I manage workplace stress effectively without burning out.", factorCode: "C", reverseKeyed: false },
  { id: 151, position: 151, text: "I am energetic in championing new initiatives and guiding teams.", factorCode: "E", reverseKeyed: false },
  { id: 152, position: 152, text: "I enjoy engaging in lively banter and lighthearted humor.", factorCode: "F", reverseKeyed: false },
  { id: 153, position: 153, text: "I adhere faithfully to institutional rules and agreements.", factorCode: "G", reverseKeyed: false },
  { id: 154, position: 154, text: "I am fearless in challenging high-stakes social situations.", factorCode: "H", reverseKeyed: false },

  // Page 23
  { id: 155, position: 155, text: "I appreciate creative artistry and human emotional expression.", factorCode: "I", reverseKeyed: false },
  { id: 156, position: 156, text: "I verify information independently before placing trust.", factorCode: "L", reverseKeyed: false },
  { id: 157, position: 157, text: "I enjoy exploring visionary possibilities that have never been tried.", factorCode: "M", reverseKeyed: false },
  { id: 158, position: 158, text: "I am discreet with confidential and personal matters.", factorCode: "N", reverseKeyed: false },
  { id: 159, position: 159, text: "I care deeply about doing the right thing and avoiding mistakes.", factorCode: "O", reverseKeyed: false },
  { id: 160, position: 160, text: "I actively seek opportunities to learn modern methodologies.", factorCode: "Q1", reverseKeyed: false },
  { id: 161, position: 161, text: "I am self-reliant and work with high autonomy.", factorCode: "Q2", reverseKeyed: false },

  // Page 24 (Last 2 items)
  { id: 162, position: 162, text: "I take pride in systematic discipline and neat organization.", factorCode: "Q3", reverseKeyed: false },
  { id: 163, position: 163, text: "I maintain high energy and drive to complete urgent assignments.", factorCode: "Q4", reverseKeyed: false },
];
