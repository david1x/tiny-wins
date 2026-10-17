// All static content: habits, stages, levels, badges, messages, tips, workouts.

export const HABITS = {
  water: {
    id: 'water', type: 'daily', icon: '💧', title: 'Water before every meal',
    cue: 'When I sit down to eat → I drink a full glass of water first',
    mini: 'One glass before any meal',
    why: 'A glass of water before a meal takes up room in your stomach, so you naturally eat a bit less, without counting anything.',
  },
  checkin: {
    id: 'checkin', type: 'daily', icon: '📝', title: 'Rate your meals', auto: 'meals',
    cue: 'After I eat → one tap: green, yellow or red',
    mini: 'Rate just one meal',
    why: 'Just noticing what you eat (self-monitoring) is one of the best-proven weight-loss habits. No calories, no photos. One tap. Rate 2+ meals for the full win.',
  },
  weighin: {
    id: 'weighin', type: 'weekly', target: 1, icon: '⚖️', title: 'Weekly weigh-in', auto: 'weight',
    cue: 'Monday morning → after the bathroom, before breakfast',
    mini: 'Any day this week counts',
    why: 'Weighing once a week keeps you aware without the daily stress. The app draws a trend line, so one salty dinner never ruins your mood.',
  },
  snackbox: {
    id: 'snackbox', type: 'once', icon: '📦', title: 'Build the family snack box',
    cue: 'Put the kid’s & partner’s snacks in an opaque box on a high shelf',
    why: 'Out of sight, out of mind. Your family keeps their treats, and you take away most of the temptation without needing any willpower. Seeing junk food is what starts most cravings.',
  },
  eyelevel: {
    id: 'eyelevel', type: 'once', icon: '🍎', title: 'Put good snacks at eye level',
    cue: 'Fruit bowl on the counter. Yogurt, cut veg & boiled eggs at the front of the fridge',
    why: 'You grab whatever you see first. Make the lazy choice the healthy choice.',
  },
  kitchen: {
    id: 'kitchen', type: 'daily', icon: '🌙', title: 'Kitchen closes after dinner',
    cue: 'After dinner → I brush my teeth = kitchen is closed',
    mini: 'No snacks after 22:00',
    why: 'Most junk-at-home damage happens late at night on the couch. Brushing your teeth tells your brain eating is over, and snacks taste bad afterwards anyway.',
  },
  protein: {
    id: 'protein', type: 'daily', icon: '🍳', title: 'Protein at breakfast',
    cue: 'When I make my coffee → I grab a protein (eggs, Greek yogurt, cottage cheese)',
    mini: 'One yogurt or 2 boiled eggs',
    why: 'Protein keeps you full for hours. A protein breakfast cuts the 11am and 4pm snack attacks.',
  },
  walk: {
    id: 'walk', type: 'daily', icon: '🚶', title: '10-min walk after lunch', workout: 'walk10',
    cue: 'After I finish lunch → I walk 10 minutes before I sit back down',
    mini: 'Walk 2 minutes, even just around the office',
    why: 'A short walk after eating evens out blood sugar and burns roughly 40–50 kcal at your size. Small, but it adds up every day.',
  },
  drinks: {
    id: 'drinks', type: 'daily', icon: '🥤', title: 'Zero sugary drinks',
    cue: 'When I want soda or juice → I pick water, sparkling, tea or a zero drink',
    mini: 'Swap at least one sweet drink',
    why: 'Calories you drink don’t fill you up. One can of regular soda a day adds up to about 6 kg of body fat over a year.',
  },
  plate: {
    id: 'plate', type: 'daily', icon: '🥗', title: 'Half plate veggies at dinner',
    cue: 'When I serve dinner → veggies go on the plate first',
    mini: 'Add one vegetable to dinner',
    why: 'Veggies fill half the plate for very few calories. You don’t eat less food, you eat different food.',
  },
  desk: {
    id: 'desk', type: 'daily', icon: '🪑', title: '2 desk breaks', workout: 'desk2',
    cue: 'When a meeting or call ends → I stand up and move for 2 minutes',
    mini: 'One stand-up break',
    why: 'Sitting all day is like keeping your metabolism on idle. Short movement breaks add up to hundreds of calories a week.',
  },
  strength: {
    id: 'strength', type: 'weekly', target: 3, icon: '💪', title: '5-min strength', workout: 'strength5',
    cue: 'When I get home from work → 5 minutes, before I touch the couch',
    mini: 'One round only (about 2.5 min)',
    why: 'Muscle burns energy even while you sleep, and keeps the weight you lose coming from fat, not muscle. Plus you’ll lift your kid easily.',
  },
  serve: {
    id: 'serve', type: 'daily', icon: '🍽️', title: 'Serve once, no seconds',
    cue: 'When my plate is empty → I wait 10 minutes before deciding on more',
    mini: 'Use a smaller plate',
    why: 'It takes about 20 minutes for “I’m full” to reach your brain. Usually, after 10 minutes, you don’t want seconds.',
  },
  sleep: {
    id: 'sleep', type: 'daily', icon: '😴', title: 'In bed by 23:30, phone away',
    cue: 'At 23:00 → phone goes on the charger outside the bedroom',
    mini: 'Phone away 15 min before sleep',
    why: 'Short sleep turns up your hunger hormones and makes junk food look much better the next day. With a baby coming, protecting sleep matters even more.',
  },
  steps: {
    id: 'steps', type: 'daily', icon: '👟', title: '7,000 steps',
    cue: 'Phone calls → walk & talk. Park further away. Stroller walk after dinner',
    mini: 'At least 5,000 steps',
    why: 'Daily steps are the biggest calorie burn a desk worker can add, and they need zero gym time.',
  },
  prep: {
    id: 'prep', type: 'weekly', target: 1, icon: '🥡', title: 'Sunday mini meal-prep',
    cue: 'Sunday after dinner → 20 min: boil eggs, cut veggies, prep 3 lunches',
    mini: 'Just boil 6 eggs for the week',
    why: 'When a good option is ready, you take it. When it isn’t, you order pizza. Prep beats willpower.',
  },
};

export const STAGES = [
  {
    name: 'Just Start', icon: '🌱', minDays: 7, goodDays: 5, habits: ['water', 'checkin', 'weighin'],
    pitch: 'Two tiny daily things and one weigh-in. That’s it. We’re training the “I show up” muscle first, before anything hard.',
  },
  {
    name: 'Danger Zone Defense', icon: '🛡️', minDays: 10, goodDays: 7, habits: ['snackbox', 'eyelevel', 'kitchen'],
    pitch: 'The junk at home isn’t the enemy. Easy access is. We rearrange the kitchen once so you don’t need willpower every night.',
  },
  {
    name: 'Protein Mornings', icon: '🍳', minDays: 14, goodDays: 10, habits: ['protein'],
    pitch: 'A protein breakfast is like a cheat code against afternoon snacking.',
  },
  {
    name: 'Walk It Off', icon: '🚶', minDays: 14, goodDays: 10, habits: ['walk'],
    pitch: 'Ten minutes after lunch. Your first movement habit, and a sneaky one.',
  },
  {
    name: 'No Liquid Calories', icon: '🥤', minDays: 14, goodDays: 10, habits: ['drinks'],
    pitch: 'The easiest calories to cut are the ones you drink.',
  },
  {
    name: 'Plate Hack', icon: '🥗', minDays: 14, goodDays: 10, habits: ['plate'],
    pitch: 'Same plate, same dinner with the family, just half of it veggies.',
  },
  {
    name: 'Desk Escape', icon: '🪑', minDays: 14, goodDays: 10, habits: ['desk'],
    pitch: 'Turn your desk job from a calorie prison into a tiny gym.',
  },
  {
    name: 'Strong Dad', icon: '💪', minDays: 14, goodDays: 10, habits: ['strength'],
    pitch: 'Five minutes, three times a week, no gym. Muscle keeps the weight off.',
  },
  {
    name: 'Slow Down', icon: '🍽️', minDays: 14, goodDays: 10, habits: ['serve'],
    pitch: 'Give your stomach time to talk to your brain.',
  },
  {
    name: 'Sleep Shield', icon: '😴', minDays: 14, goodDays: 10, habits: ['sleep'],
    pitch: 'Tired brains crave junk. Guard your sleep, especially with a newborn on the way.',
  },
  {
    name: 'Step Up', icon: '👟', minDays: 14, goodDays: 10, habits: ['steps'],
    pitch: 'You’ve built the base. Now we turn up daily movement.',
  },
  {
    name: 'Autopilot', icon: '🚀', minDays: 14, goodDays: 10, habits: ['prep'],
    pitch: 'Your final stage. Plan ahead once a week, and all of this becomes simply who you are.',
  },
];

export const LEVELS = [
  [0, 'Couch Starter'], [100, 'Water Rookie'], [250, 'Snack Spotter'], [450, 'Craving Fighter'],
  [700, 'Habit Builder'], [1000, 'Kitchen Closer'], [1400, 'Walk Warrior'], [1900, 'Plate Master'],
  [2500, 'Steady Grinder'], [3200, 'Momentum Maker'], [4000, 'Unstoppable'], [5000, 'Habit Machine'],
  [6200, 'Role Model'], [7600, 'Transformer'], [9200, 'Legend'], [11000, 'Tiny Wins Hero'],
];

// Each check(ctx) gets { streak, best, lost, beat, weighins, workouts, stage, totalLoss, comeback, survivalUsed }
export const BADGES = [
  { id: 'first', icon: '✨', name: 'First Tiny Win', hint: 'Complete any habit', check: c => c.anyHabit },
  { id: 's3', icon: '🔥', name: '3-Day Spark', hint: '3-day streak', check: c => c.best >= 3 },
  { id: 's7', icon: '🔥', name: 'One Week Strong', hint: '7-day streak', check: c => c.best >= 7 },
  { id: 's14', icon: '🔥', name: 'Two Weeks!', hint: '14-day streak', check: c => c.best >= 14 },
  { id: 's30', icon: '🏆', name: 'Monthly Machine', hint: '30-day streak', check: c => c.best >= 30 },
  { id: 's60', icon: '🏆', name: 'Habit Formed', hint: '60-day streak', check: c => c.best >= 60 },
  { id: 's100', icon: '👑', name: 'Century', hint: '100-day streak', check: c => c.best >= 100 },
  { id: 'c1', icon: '🌊', name: 'Wave Rider', hint: 'Beat your first craving', check: c => c.beat >= 1 },
  { id: 'c10', icon: '🥷', name: 'Snack Ninja', hint: 'Beat 10 cravings', check: c => c.beat >= 10 },
  { id: 'c25', icon: '🧠', name: 'Brain Rewired', hint: 'Beat 25 cravings', check: c => c.beat >= 25 },
  { id: 'w1', icon: '📉', name: 'First Kilo', hint: 'Lose 1 kg', check: c => c.lost >= 1 },
  { id: 'w25', icon: '📉', name: '2.5 Down', hint: 'Lose 2.5 kg', check: c => c.lost >= 2.5 },
  { id: 'w5p', icon: '❤️', name: 'Health Boost', hint: 'Lose 5% of your start weight', check: c => c.lostPct >= 5 },
  { id: 'w5', icon: '🎯', name: 'Five Down', hint: 'Lose 5 kg', check: c => c.lost >= 5 },
  { id: 'w75', icon: '🎯', name: 'Halfway Hero', hint: 'Reach half your goal', check: c => c.totalLoss > 0 && c.lost >= c.totalLoss / 2 },
  { id: 'w10', icon: '🚀', name: 'Ten Down', hint: 'Lose 10 kg', check: c => c.lost >= 10 },
  { id: 'goal', icon: '👑', name: 'GOAL!', hint: 'Reach your goal weight', check: c => c.totalLoss > 0 && c.lost >= c.totalLoss },
  { id: 'wi4', icon: '⚖️', name: 'Honest Scale', hint: '4 weekly weigh-ins', check: c => c.weighins >= 4 },
  { id: 'wo5', icon: '💪', name: 'Mover', hint: 'Finish 5 guided workouts', check: c => c.workouts >= 5 },
  { id: 'wo25', icon: '🏋️', name: 'Iron Dad', hint: 'Finish 25 guided workouts', check: c => c.workouts >= 25 },
  { id: 'st3', icon: '🗺️', name: 'Explorer', hint: 'Reach stage 3', check: c => c.stage >= 2 },
  { id: 'st6', icon: '⛰️', name: 'Halfway Up', hint: 'Reach stage 6', check: c => c.stage >= 5 },
  { id: 'st12', icon: '🚀', name: 'Autopilot', hint: 'Reach the final stage', check: c => c.stage >= 11 },
  { id: 'back', icon: '🔁', name: 'Comeback', hint: 'Bounce back right after a missed day', check: c => c.comeback },
  { id: 'surv', icon: '🛟', name: 'Didn’t Quit', hint: 'Use survival mode instead of giving up', check: c => c.survivalUsed },
];

export const LIFE_TAGS = [
  ['desk', '💻 Desk job'], ['kids', '👶 Kids at home'], ['pregnant', '🤰 Partner pregnant'],
  ['junk', '🍪 Junk food at home'], ['night', '🌙 Night snacker'], ['sweet', '🍫 Sweet tooth'],
  ['salty', '🍟 Salty / crunchy'], ['stress', '😤 Stress eater'], ['sleep', '😴 Short on sleep'],
];

export const IDENTITIES = [
  'A dad with energy to play with my kids',
  'Someone who controls food, not the other way around',
  'A healthy role model for my family',
  'A guy who feels good in his clothes',
];

// Daily "boost" lines. {name} gets replaced. Tags tune who sees them.
export const BOOSTS = [
  { t: 'Every glass of water is a vote for the person you’re becoming.' },
  { t: 'You don’t need motivation. You need a habit so small that motivation doesn’t matter.' },
  { t: 'Kids copy what you do, not what you say. They’re watching you get healthier.', tag: 'kids' },
  { t: 'The baby is coming. A lighter, fitter dad has more energy for those 3am feeds.', tag: 'pregnant' },
  { t: 'The snack box isn’t yours. You’re not on a diet, you just have better stuff.', tag: 'junk' },
  { t: 'Bad day? Do the mini version. A tiny win still counts as a win.' },
  { t: 'Losing 15 kg in a year is about 290 g a week. You can’t feel 290 g. That’s the point.' },
  { t: 'Slow weight loss stays lost. Fast weight loss comes back.' },
  { t: 'Missing once is an accident. Missing twice is the start of a new habit. Never miss twice.' },
  { t: 'You’re not lazy, you just haven’t had a plan built for real life. This one is.' },
  { t: 'Cravings are waves. They peak and pass in about 10–15 minutes. You can surf.' },
  { t: 'Your desk job burns little. Your habits can fix that, 2 minutes at a time.', tag: 'desk' },
  { t: 'You don’t rise to your goals. You fall to the level of your systems.' },
  { t: 'Progress, not perfection. 80% consistency beats 100% for three weeks.' },
  { t: '{name}, nobody notices one day. Everyone notices one year.' },
  { t: 'Tired? That hunger might be fatigue. Sleep first, decide about food tomorrow.', tag: 'sleep' },
  { t: 'Stress wants a cookie. Your body wants a 2-minute walk. Try the walk first.', tag: 'stress' },
  { t: 'Eat the same dinner as your family, just a smaller portion and more veggies.', tag: 'kids' },
  { t: 'The best workout is the one you actually do. Even 5 minutes.' },
  { t: 'You already started, and that’s the hardest part. Keep the chain going.' },
  { t: 'Night-time you and morning you want different things. Make it easy for night-time you to choose well.', tag: 'night' },
  { t: 'One cookie didn’t make you gain weight. One salad won’t make you lose it. Habits do.' },
  { t: 'Craving something crunchy? Popcorn, cucumbers or rice cakes. Crunch without the damage.', tag: 'salty' },
  { t: 'Sweet tooth? Fruit + Greek yogurt, or 2 squares of dark chocolate. Then close the kitchen.', tag: 'sweet' },
];

export const TIPS = [
  { t: 'Ask your partner to keep the kids’ snacks in their own cupboard or box. Not banned, just not in your view.', tag: 'junk' },
  { t: 'Never eat junk straight from the bag. Put a portion in a bowl, and put the bag away first.', tag: 'junk' },
  { t: 'Finishing your kid’s leftovers? Those are real calories. Trash them or save them in the fridge.', tag: 'kids' },
  { t: 'Pregnancy cravings in the house? Buy her treats in single-serve packs, so there’s no giant bag lying around.', tag: 'pregnant' },
  { t: 'Keep a big water bottle on your desk. Refill it twice and you’ve covered most of your water.', tag: 'desk' },
  { t: 'Bring lunch 2 days a week. That alone can cut a few thousand kcal a month compared to takeout.', tag: 'desk' },
  { t: 'The 10-minute rule: want junk? Fine, but wait 10 minutes first. Most cravings pass.' },
  { t: 'Hand portions: protein = 1–2 palms, carbs = 1–2 cupped hands, veggies = 2 fists, fats = 1–2 thumbs.' },
  { t: 'Eat slowly: put your fork down between bites. It feels weird for 3 days, then it’s automatic.' },
  { t: 'Shopping hungry = shopping junk. Eat a yogurt before the supermarket.' },
  { t: 'Weekends count. Plan one treat meal, enjoy it fully, and get back to normal at the next meal.' },
  { t: 'Coffee with sugar and milk 3x a day can be 300+ kcal. Try one less sugar per week.' },
  { t: 'Use smaller plates and bowls. Your brain judges portions by how full the plate looks.' },
  { t: 'Clear junk off the counter. If you see it on the counter, you’ll end up eating it.', tag: 'junk' },
  { t: 'Night snacking? Make a hot herbal tea after dinner. It’s a ritual that says “day’s over”.', tag: 'night' },
  { t: 'Stroller walks count! 20 min after dinner with the family = steps + family time.', tag: 'kids' },
  { t: 'Weight jumps 1–2 kg overnight from salt and water. Only the weekly trend matters.' },
  { t: 'Stand up for every phone call. That’s an easy 30+ minutes of standing per week.', tag: 'desk' },
  { t: 'Protein snacks that need zero cooking: Greek yogurt, cottage cheese, tuna can, protein milk, boiled eggs.' },
  { t: 'Order smart: grilled > fried, sauce on the side, double veggies instead of fries.' },
];

export const CRAVINGS = {
  sweet: {
    icon: '🍫', label: 'Sweet',
    tips: ['Drink a big glass of cold water or tea', 'Brush your teeth (sweets taste awful after)', 'Leave the kitchen and do something with your hands'],
    swap: 'Still want it after the wave? Have fruit + Greek yogurt, or 2 squares of dark chocolate. Put it in a bowl and eat it sitting down.',
  },
  salty: {
    icon: '🍟', label: 'Salty / crunchy',
    tips: ['Drink water: thirst often feels like salt cravings', 'Chew gum for 5 minutes', 'Step outside for 2 minutes of fresh air'],
    swap: 'Still want crunch? Air-popped popcorn, cucumber with salt, or a rice cake. One bowl, then the bag goes back.',
  },
  bored: {
    icon: '😐', label: 'Bored',
    tips: ['This isn’t hunger. Your brain wants something to do', 'Play 5 min with your kid or text a friend', 'Walk around the block or tidy up one thing'],
    swap: 'Boredom passes fastest when you change the room. Go do anything that isn’t in the kitchen.',
  },
  stressed: {
    icon: '😤', label: 'Stressed',
    tips: ['Do 5 slow breaths with the circle above', 'Step outside, look at something far away', 'Write the worry down in one sentence'],
    swap: 'Food calms stress for 5 minutes, then you feel guilty. A 2-minute walk calms it longer.',
  },
  tired: {
    icon: '😴', label: 'Tired',
    tips: ['Tired brains crave sugar. It’s fatigue, not hunger', 'Drink water and go to bed 20 min earlier tonight', 'If it’s afternoon: stand up, stretch, open a window'],
    swap: 'The best snack for tiredness is sleep. Tomorrow’s cravings will be smaller.',
  },
  hungry: {
    icon: '🍽️', label: 'Actually hungry',
    tips: [],
    swap: '',
  },
};

export const SMART_SNACKS = [
  '🥛 Greek yogurt (+ berries)', '🥚 2 boiled eggs', '🐟 Tuna can + crackers', '🧀 Cottage cheese + cucumber',
  '🍎 Apple + 1 tbsp peanut butter', '🥕 Veggie sticks + hummus', '🍌 Banana + glass of milk', '🍿 Popcorn (1 bowl)',
];

export const IF_THEN_PRESETS = [
  'If I crave sweets at night → I make tea and brush my teeth',
  'If I see the kids’ snacks → I drink a glass of water and leave the kitchen',
  'If I’m bored after work → I take a 5-min walk first',
  'If I’m stressed → I do 5 slow breaths before opening the fridge',
  'If I want seconds → I wait 10 minutes first',
];

export const WORKOUTS = {
  desk2: {
    name: '2-Min Desk Break', icon: '🪑', blurb: 'No sweat, office-safe',
    steps: [
      { n: 'Stand up & reach for the ceiling', s: 20, e: '🙆' },
      { n: 'Shoulder rolls (back & forward)', s: 20, e: '🔄' },
      { n: 'Slow chair squats: touch the seat, stand up', s: 30, e: '🪑' },
      { n: 'Calf raises, hold the desk', s: 25, e: '🦶' },
      { n: 'Gentle torso twists', s: 25, e: '🌀' },
    ],
  },
  strength5: {
    name: '5-Min Starter Strength', icon: '💪', blurb: 'At home, no equipment',
    steps: [
      { n: 'Wall push-ups', s: 30, e: '🧱' },
      { n: 'Rest', s: 8, e: '😮‍💨', rest: true },
      { n: 'Chair squats', s: 30, e: '🪑' },
      { n: 'Rest', s: 8, e: '😮‍💨', rest: true },
      { n: 'Marching knee lifts', s: 30, e: '🦵' },
      { n: 'Rest', s: 8, e: '😮‍💨', rest: true },
      { n: 'Incline plank on a table / couch', s: 30, e: '🧘' },
      { n: 'Rest: round 2 coming!', s: 15, e: '💧', rest: true },
      { n: 'Wall push-ups', s: 30, e: '🧱' },
      { n: 'Rest', s: 8, e: '😮‍💨', rest: true },
      { n: 'Chair squats', s: 30, e: '🪑' },
      { n: 'Rest', s: 8, e: '😮‍💨', rest: true },
      { n: 'Marching knee lifts', s: 30, e: '🦵' },
      { n: 'Rest', s: 8, e: '😮‍💨', rest: true },
      { n: 'Incline plank on a table / couch', s: 30, e: '🧘' },
    ],
  },
  walk10: {
    name: '10-Min Walk', icon: '🚶', blurb: 'Any pace. Just go',
    steps: [
      { n: 'Easy pace: get going', s: 120, e: '🚶' },
      { n: 'A bit brisker: swing your arms', s: 300, e: '💨' },
      { n: 'Cool down, almost done', s: 180, e: '🌤️' },
    ],
  },
};

export const SCIENCE = [
  ['Tiny Habits', 'Every habit starts so small it feels silly. Small = no willpower needed. Each stage adds just one.'],
  ['Implementation intentions', 'Each habit comes with an “After X → I do Y” cue. People who plan when and where they’ll do something are much more likely to actually do it.'],
  ['Environment design', 'The snack box and eye-level tricks remove temptation instead of fighting it. This is key when there’s junk at home.'],
  ['Never miss twice', 'Streak freezes and a “never miss twice” rule turn a bad day into a pause, not a reason to quit.'],
  ['Urge surfing', 'The Craving SOS teaches you to ride out cravings, which peak and fade within minutes, instead of obeying them.'],
  ['Identity-based habits', 'You chose who you’re becoming. Every tiny win is a vote for that person.'],
  ['Variable rewards', 'XP, levels, surprise “lucky” bonuses and badges give your brain a dopamine hit for doing healthy things.'],
  ['Goal gradient', 'Big goals are split into stages and milestones, so the next win always feels close.'],
  ['Self-compassion', 'Logging an honest slip still earns XP. Shame makes people quit, honesty keeps them going.'],
  ['Fresh start effect', 'Every Monday brings a weekly review and a clean slate, which is a natural moment to recommit.'],
  ['Commitment device', 'You signed a contract with yourself. Public or written commitments make follow-through more likely.'],
];
