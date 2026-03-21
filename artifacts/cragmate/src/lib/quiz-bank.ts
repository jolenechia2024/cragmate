export type ClimberType =
  | "Technician"
  | "Explorer"
  | "Strategist"
  | "Flow Climber"
  | "Motivator"
  | "Grinder"
  | "Risk-Taker"
  | "Calm Connector";

export type QuizQuestion = {
  question: string;
  a: ClimberType;
  b: ClimberType;
  aL: string;
  bL: string;
};

export const QUESTION_BANK: QuizQuestion[] = [
  { question: "You just walked into the gym. First move?", a: "Technician", b: "Explorer", aL: "Quiet warm-up laps and tidy footwork", bL: "Tour the wall and try random cool problems" },
  { question: "Your project keeps spitting you off. You...", a: "Strategist", b: "Flow Climber", aL: "Film beta, split it into chunks, make a plan", bL: "Shake out, breathe, and chase a cleaner rhythm" },
  { question: "Playlist and vibes check?", a: "Motivator", b: "Calm Connector", aL: "Hype mode. Energy up, attempts up.", bL: "Chill mode. Smooth breathing and flow." },
  { question: "Crux move above the last good hold?", a: "Risk-Taker", b: "Grinder", aL: "Full commit. If I peel, I peel.", bL: "Repeat setup until it feels automatic." },
  { question: "Best climbing day feels like...", a: "Explorer", b: "Strategist", aL: "Tried 20 weird boulders and found new styles", bL: "Hit today's target and can prove progress" },
  { question: "What do you write in notes after a send?", a: "Technician", b: "Flow Climber", aL: "Heel timing, hip angle, exact foot swap", bL: "Felt snappy, calm, and in sync today" },
  { question: "Someone is wobbling on a sketchy slab. You...", a: "Grinder", b: "Calm Connector", aL: "Suggest they dial the feet and try it again", bL: "Stay quiet and let them figure it out" },
  { question: "A hold looks greasy. Do you...", a: "Technician", b: "Risk-Taker", aL: "Brush it, chalk, and trust the process", bL: "Send anyway and hope the chalk gods smile" },
  { question: "Your buddy is stuck in a plateau. You...", a: "Motivator", b: "Explorer", aL: "Pump them up and cheer until they stick it", bL: "Suggest weird beta or a different wall" },
  { question: "Before a comp or big send, you prefer to...", a: "Strategist", b: "Risk-Taker", aL: "Run the beta in your head and stick to the plan", bL: "Warm up, breathe, and go for it" },
  { question: "Rest day and you are antsy. You...", a: "Explorer", b: "Technician", aL: "Watch comp videos and study beta", bL: "Stretch, hangboard lightly, or skip" },
  { question: "You fell at the same move five times. Next?", a: "Grinder", b: "Flow Climber", aL: "One more burn with tiny tweaks", bL: "Walk away and come back fresh" },
  { question: "A stranger asks for beta. You...", a: "Calm Connector", b: "Motivator", aL: "Give a short hint and let them try", bL: "Walk them through the whole sequence" },
  { question: "Your fingers are fried. You...", a: "Strategist", b: "Risk-Taker", aL: "Switch to easier climbs or skills work", bL: "Push one more hard attempt" },
  { question: "Someone flashes your project. You...", a: "Explorer", b: "Technician", aL: "Ask what beta they used", bL: "Nod, chalk up, and keep trying" },
  { question: "Warm-up feels off. You...", a: "Flow Climber", b: "Grinder", aL: "Take extra time and skip grades", bL: "Stick to the plan and push through" },
  { question: "You are about to try a dyno. You...", a: "Risk-Taker", b: "Strategist", aL: "Commit and go", bL: "Mark the landing hold and plan the swing" },
  { question: "Gym is packed. You...", a: "Calm Connector", b: "Motivator", aL: "Find a quieter corner or wait", bL: "Join a group and make it social" },
  { question: "You keep cutting feet. You...", a: "Technician", b: "Flow Climber", aL: "Film and check foot placement", bL: "Relax the grip and trust the core" },
  { question: "New gym opened. First visit you...", a: "Explorer", b: "Grinder", aL: "Wander every wall and sample", bL: "Find one project and dig in" },
  { question: "Your partner wants to leave early. You...", a: "Motivator", b: "Strategist", aL: "Convince them to stay one more", bL: "Plan a shorter session next time" },
  { question: "Crimpy problem vs slopey. You pick...", a: "Technician", b: "Flow Climber", aL: "Crimpy — precision feels good", bL: "Slopey — body tension is fun" },
  { question: "You are nervous before a lead. You...", a: "Calm Connector", b: "Risk-Taker", aL: "Breathe and visualize the clip", bL: "Pull on and trust the training" },
  { question: "Route feels sandbagged. You...", a: "Grinder", b: "Explorer", aL: "Keep at it until it goes", bL: "Try something else and come back" },
  { question: "Session goals: you usually...", a: "Strategist", b: "Flow Climber", aL: "Set a target (grade or send count)", bL: "Go with the flow and see what happens" },
  { question: "Someone is spraying beta. You...", a: "Calm Connector", b: "Technician", aL: "Nod and try it your way", bL: "Listen and test their idea" },
  { question: "You are close to a new grade. You...", a: "Motivator", b: "Grinder", aL: "Get pumped and go for it", bL: "Work the moves until they feel easy" },
  { question: "Best training partner is...", a: "Explorer", b: "Strategist", aL: "Someone who tries everything", bL: "Someone with a clear plan" },
  { question: "You are tired mid-session. You...", a: "Flow Climber", b: "Risk-Taker", aL: "Downshift and enjoy easy climbs", bL: "Rest, then one last hard go" },
  { question: "Crowd gathers for your project. You...", a: "Calm Connector", b: "Motivator", aL: "Ignore them and climb", bL: "Use the energy and send" },
];
