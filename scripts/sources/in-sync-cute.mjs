// In Sync prompts, Cute vibe. Hand written for NexPlay.
// Formats, one prompt per line (see scripts/build-in-sync.mjs):
//   tot     "A | B"  or  "Lead :: A | B"   (This or That; A is the cosier pick, B the bolder one)
//   mind    "Prompt | option | option | option | option"   (Read My Mind; options run calm to wild)
//   finish  "Sentence start… | option | option | option | option"
//   scale   "Question | what 1 means | what 5 means"
//   likely  "…the rest of 'Who is more likely to'"

export const CUTE = {
  tot: `
Jollof rice | Fried rice
Night in | Night out
Puff-puff | Chin chin
Beach day | Mountain hike
Cats | Dogs
Morning person | Night owl
Tea | Coffee
Sunrise | Sunset
Call | Text
Sweet | Savoury
Rainy day | Sunny day
Movie at home | Movie at the cinema
Pancakes | Waffles
Indomie | Spaghetti
Suya | Shawarma
Plantain fried | Plantain roasted (boli)
Window seat | Aisle seat
Hugs | High fives
Cook together | Order in
Board games | Video games
Early to the party | Fashionably late
Fanta | Coke
Zobo | Chapman
Ice cream | Cake
Road trip | Flight
Sleep in | Brunch date
Love letters | Voice notes
Matching outfits | Matching phone cases
Small wedding | Owambe with 500 guests
Picnic in the park | Dinner on a rooftop
Bread and tea | Akara and pap
Kpomo | Gizzard
Pepper soup | Egusi soup
Big cuddle | Long walk
Watch the sunset | Dance in the rain
Nollywood classic | Hollywood blockbuster
Gele | Fila
Ankara | Denim
Sneakers | Slides
Sing in the shower | Dance in the kitchen
Dessert first | Dessert never
Handwritten note | Surprise gift
Breakfast in bed | Breakfast at a café
Same side of the bed every night | Swap sides for fun
Silly selfies | Serious photos
Holiday in Calabar | Holiday in Zanzibar
Stay with family at Christmas | Travel somewhere new at Christmas
Fluffy socks | Bare feet
Window shopping | Actual shopping
Netflix | YouTube
Cartoons | Reality TV
Chocolate | Sweets
Popcorn salty | Popcorn sweet
Hot weather | Cold weather
Bubble bath | Long shower
Nicknames | Real names
Burna Boy | Wizkid
Davido | Rema
Tems | Ayra Starr
Afrobeats | R&B
Karaoke | Dance floor
Dinner for two | Double date
Baking | Grilling
Mango | Pineapple
Agege bread | Croissant
Moi moi | Akara
Ofada rice | Coconut rice
Amala | Pounded yam
Garden | Balcony
Bicycles | Scooters
Postcards | Photo albums
Theme park | Museum
Pillow fort | Treehouse
Board game night | Quiz night
Plan everything | Go with the flow
Surprise party | Quiet birthday dinner
Book | Audiobook
Puzzle | Crossword
Cosy café | Busy food market
Lagos | Abuja
City life | Village life
Hammock | Swing
Teddy bear | Fresh flowers
Bake a cake together | Paint together
Pets with fur | Pets with fins
Small house with a big garden | Big house in the city
Cuddle on the couch | Go for a drive
Stars | Fireworks
Rice | Swallow
Spoon | Hand
Dodo with eggs | Dodo with beans
Fish | Chicken
Grilled corn | Roasted groundnuts
Watermelon | Pawpaw
Short and sweet texts | Long paragraph texts
Emoji | GIF
Old school love songs | New school love songs
Celebrate monthiversaries | Only anniversaries
Laugh until you cry | Cry until you laugh
Home-cooked meal | Fancy restaurant
Weekend away | Staycation
Sit by the window | Sit by the fire
Learn a dance together | Learn a language together
Write a song together | Plant a garden together
Fruit salad | Smoothie
Bus in Lagos traffic | Okada through the traffic
Sweater weather | Beach weather
Flip-flops | Socks and sandals
Board shorts | Swimsuit
Thunderstorm | Light drizzle
Ludo | Whot
Ayo | Draughts
Snail | Prawns
Meat pie | Sausage roll
Fried yam | Yam porridge
Breakfast person | Midnight snack person
Morning walk | Evening walk
Breakfast for dinner | Dinner for breakfast
Polaroid | Phone camera
Sticker on the fridge | Photo on the wall
Disney movie | Superhero movie
Animated film | Romcom
`,
  pairs: `
Small chops :: Puff-puff | Samosa | Spring roll | Peppered gizzard | Mosa | Peppered snail
Breakfast :: Akara and pap | Yam and egg sauce | Bread and tea | Pancakes | Moi moi and custard
Swallow :: Pounded yam | Amala | Eba | Semo | Fufu | Wheat
Soup :: Egusi | Efo riro | Okro | Ogbono | Banga | Afang | Edikang ikong
Sunday treat :: Ice cream | Chin chin | Doughnut | Cake | Popcorn | Plantain chips
Drink :: Zobo | Kunu | Chapman | Malt | Fanta | Tiger nut milk
Date spot :: Cinema | Beach | Bowling alley | Art gallery | Rooftop lounge | Karaoke bar
Pet :: Puppy | Kitten | Parrot | Goldfish | Rabbit | Tortoise
Holiday :: Paris | Cape Town | Dubai | Zanzibar | Accra | Bali
Superpower :: Fly | Teleport | Read minds | Be invisible | Freeze time | Talk to animals
Season :: Harmattan | Rainy season | Christmas season | Summer holidays
Cosy activity :: Reading together | Napping together | Cooking together | Watching cartoons | Doing a puzzle
Fruit :: Mango | Orange | Pineapple | Banana | Watermelon | Agbalumo
Dessert :: Chocolate cake | Ice cream | Fruit salad | Cheesecake | Doughnut | Brownies
Movie genre :: Comedy | Romance | Action | Horror | Animation | Thriller
Game night :: Ludo | Whot | Scrabble | Monopoly | Cards | Charades
Weekend morning :: Lie in | Jog | Big breakfast | Church or mosque | Market run | Clean the house
Celebration :: Owambe | House party | Beach party | Quiet dinner | Game night | Road trip
Gift :: Flowers | Chocolate | Perfume | Shoes | Book | Handmade card
Treat after a long day :: Foot rub | Shawarma | Hot shower | Long nap | Funny video | Chilled drink
`,
  mind: `
Go-to comfort food | Jollof rice | Indomie with egg | Pounded yam and egusi | Pizza
Ideal Saturday | Sleep till noon | Brunch and a stroll | Market run and cooking | Party till late
Biggest pet peeve | Loud chewing | People who are late | Slow walkers | Leaving dishes in the sink
Favourite way to say I love you | Hugs | Small gifts | Cooking a meal | Saying it out loud
Most used emoji | The crying laughing face | The red heart | The praying hands | The fire
Dream pet | Cat | Dog | Parrot | Something wild like a monkey
Favourite part of the day | Early morning | Lunch time | Evening | Late night
Go-to karaoke song | A worship song | A love ballad | An Afrobeats jam | A rap verse
Snack of choice | Chin chin | Plantain chips | Chocolate | Suya
First thing done in the morning | Pray or meditate | Check the phone | Brush teeth | Hit snooze
Favourite room in the house | Bedroom | Kitchen | Living room | Balcony
Dream holiday | A quiet village | A beach resort | A big city | A safari adventure
Ice cream flavour | Vanilla | Chocolate | Strawberry | Something wild like bubblegum
Best way to spend a rainy day | Under the duvet | Baking something | Movie marathon | Dancing in the rain
Childhood dream job | Doctor | Teacher | Musician | Pilot
How birthdays should be | Quiet with family | Dinner with close friends | A house party | A full owambe
Favourite cartoon growing up | Tom and Jerry | Dora | Spongebob | Dragon Ball Z
Favourite season | Harmattan | Rainy season | Christmas | Easter break
Superpower they would pick | Healing | Teleporting | Reading minds | Flying
Most likely to be found at a party | By the food | Chatting in a corner | Taking photos | On the dance floor
What makes them laugh hardest | Silly puns | Funny videos | Pranks | Their own jokes
Favourite thing to cook | Rice | Stew | Pasta | Something experimental
Sleep style | Like a starfish | Curled up tight | Hugging a pillow | All over the place
Morning drink | Water | Tea | Coffee | Energy drink
Favourite Nollywood genre | Family drama | Comedy | Romance | Thriller
Weekend outfit | Pyjamas all day | Tracksuit | Jeans and a tee | Full drip
Phone wallpaper | A family photo | A nature picture | A quote | Us together
Ideal pizza topping | Just cheese | Chicken | Pepperoni | Pineapple
Favourite smell | Fresh bread | Rain | Perfume | Suya smoke
Most treasured possession | Old photos | Their phone | A gift from family | Their shoes
Bedtime | Before 10pm | Around 11pm | After midnight | When the sun is rising
Way of dealing with stress | Sleep it off | Talk to someone | Eat something nice | Go out and move
Favourite colour | Blue | Green | Pink | Red
Best compliment to receive | You are kind | You are smart | You are funny | You look amazing
Dream car | Something small and reliable | A family SUV | A vintage classic | A flashy sports car
Favourite school subject | English | Maths | Biology | Fine art
Shopping style | Buys only what is on the list | Compares prices forever | Buys on impulse | Leaves with five bags
How they eat a cake | Fork, slowly | Icing first | Big bites | Straight from the box
Favourite kind of music for a road trip | Gospel | Old school highlife | Afrobeats | Amapiano
Weekend chore they hate most | Laundry | Dishes | Ironing | Sweeping
Ideal number of kids | None | One or two | Three or four | A whole football team
Best gift ever | Something handmade | A surprise trip | A gadget | Money, honestly
What they order at a new restaurant | Something familiar | The waiter's pick | The cheapest thing | The weirdest thing on the menu
Favourite kind of weather | Cool and breezy | Warm and sunny | Rainy | Stormy
Favourite way to travel | Car | Train | Plane | Boat
Hidden talent | Cooking | Drawing | Singing | Dancing
Comfort show | A family sitcom | An old Nollywood film | A cooking show | Reality TV
Typing style | Full sentences | Short replies | Voice notes | Only emojis
Celebrity crush energy | Funny and sweet | Smart and calm | Talented and humble | Bold and flashy
Snack at the cinema | Water | Popcorn | Nachos | Everything at the counter
Favourite holiday | Christmas | Easter | Sallah | New Year
Bathroom habit | Quick shower | Long hot shower | Bath with bubbles | Concert in the shower
Bread spread | Butter | Jam | Peanut butter | Chocolate spread
What they do when bored | Sleep | Scroll | Snack | Call someone
Where they would rather live | A quiet village | A small town | Lagos | A city abroad
Fashion icon type | Simple and neat | Smart casual | Bright Ankara | Bold and trendy
Favourite animal | Elephant | Dog | Lion | Dolphin
Way to show affection in public | Hold hands | Arm around the shoulder | A cheeky wink | Full hug and kiss
Laugh style | Silent shake | Little giggle | Loud belly laugh | Laugh and clap
Ideal date length | One hour | An afternoon | All day | The whole weekend
What wakes them up | An alarm | Sunlight | Hunger | Someone shouting their name
How they open presents | Carefully save the paper | Neatly | Fast | Rip it apart
Favourite Christmas thing | Church service | Family food | Lights and decorations | Parties
Most played game | Ludo | Candy Crush | FIFA | Whot
How they answer the phone | Hello, who is this? | Hello love | Hey! | Talk to me
Favourite street food | Boli and groundnut | Roasted corn | Suya | Shawarma
Way they keep their room | Spotless | Mostly tidy | Organised chaos | A beautiful disaster
Favourite type of present to give | Something thoughtful | Something useful | Something funny | Something expensive
Biggest fear | Spiders | Heights | Snakes | Being broke
Coffee or tea order | Plain water please | Tea with milk | Black coffee | Fancy caramel latte
Dream hobby | Gardening | Painting | Music | Skydiving
Where they sit in class | Front row | Middle | Back row | Wherever friends are
Lucky number | 1 | 3 | 7 | 9
How long they take to get ready | Five minutes | Twenty minutes | An hour | Start without me
Favourite fast food | Chicken Republic | Mr Biggs nostalgia | KFC | Domino's
Most annoying habit | Leaving lights on | Forgetting things | Being late | Talking too much
Favourite toy as a child | A doll or teddy | A bicycle | A football | Anything that made noise
Mood in the morning | Sunny and chatty | Quiet but fine | Grumpy until food | Do not talk to me
Favourite way to relax | Nap | Music | Long walk | Party
Favourite day of the week | Monday | Friday | Saturday | Sunday
Signature dance move | Two-step | Shaku shaku | Zanku | Full freestyle
Most likely holiday souvenir | A fridge magnet | Local food | Clothes | A tattoo
What they spend too much on | Food | Clothes | Data | Gadgets
Favourite sound | Rain on the roof | Birds in the morning | Laughter | Bass at a party
How they react to a scary film | Hide behind a pillow | Watch through fingers | Laugh at it | Shout at the characters
What they would name a pet | Something cute like Bubbles | A human name like Kunle | A food like Suya | Something grand like King
Favourite mealtime | Breakfast | Lunch | Dinner | Midnight snack
Favourite place to be kissed on the cheek | Left cheek | Right cheek | Forehead instead | Everywhere please
Idea of a perfect gift wrap | A plain bag | Neat paper | Ribbons and bows | A treasure hunt
Ideal morning soundtrack | Silence | Gospel | Soft R&B | Loud Afrobeats
Favourite thing about weekends | Rest | Food | Family | Going out
What they miss most from childhood | Naps | No bills | School friends | Mum's cooking
`,
  finish: `
Our perfect Sunday starts with… | A long lie in | Church or mosque together | A big breakfast | A spontaneous trip
If we had a theme song it would be… | A sweet love ballad | An old highlife classic | An Afrobeats jam | A cartoon theme tune
Our dream house must have… | A big kitchen | A cosy reading corner | A garden | A swimming pool
If we opened a business together it would be… | A bakery | A bookshop café | A restaurant | A nightclub
Our couple superpower is… | Making each other laugh | Cooking together | Planning trips | Finding the best parties
On a lazy day we usually… | Sleep | Watch films | Eat everything | Find something to do anyway
If we were a food we would be… | Rice and stew | Jollof and plantain | Suya and onions | Pepper soup
Our first pet should be called… | Bubbles | Kunle | Suya | Captain
The best thing about us is… | We are kind to each other | We laugh a lot | We are a great team | We have the best adventures
If we were cartoon characters we would be… | Winnie and Piglet | Tom and Jerry | Shrek and Fiona | Batman and Robin
Our ideal anniversary is… | A quiet dinner at home | A fancy restaurant | A weekend away | A big party with friends
When we argue it is usually about… | Food | Being late | Phones | Who is right
We would survive a zombie attack by… | Hiding at home | Making a plan | Running very fast | Fighting them all
Our holiday photo album is full of… | Food | Sunsets | Selfies | Silly faces
If we had a cooking show it would be called… | Cooking with Love | Pot of Two | Kitchen Wahala | Spice It Up
The song we would dance to at our wedding is… | A slow love song | A Yoruba classic | An Afrobeats hit | Something that makes everyone jump
Our favourite way to spend money together is… | Saving it | Groceries for a big cook | Eating out | Travelling
In a group project we would be… | The ones who organise | The quiet workers | The ideas people | The ones who make it fun
We are most like… | Bread and butter | Tea and biscuits | Rice and beans | Jollof and fried plantain
If we won the lottery we would first… | Save it | Buy a house | Help family | Travel the world
Our relationship is like a film called… | Sweet Home | Love in Lagos | The Great Adventure | Chaos and Cuddles
When we go to a party we… | Leave early | Stay with our friends | Eat first, dance later | Close the party
The thing we always forget is… | The keys | Birthdays | To charge the phone | Where we parked
Our perfect date night costs… | Nothing | A little | A fair amount | Do not ask
We will grow old together by… | A quiet lake | In our family house | In a busy city | Travelling everywhere
Our secret handshake would end with… | A hug | A kiss on the cheek | A high five | A dance move
On a long road trip we… | Sleep | Snack nonstop | Talk all the way | Sing every song loudly
If we had a family motto it would be… | Love first | Food is life | Work hard, rest well | Live loud
The most romantic thing ever is… | A handwritten letter | Breakfast in bed | A surprise visit | A grand gesture in public
The first thing we would buy for our home is… | A comfy couch | A big bed | A good fridge | A huge TV
Our Saturday nights are for… | Sleep | Movies | Dinner out | Parties
When it rains we like to… | Stay in bed | Make tea and talk | Eat something hot | Dance outside
If we were a pair of shoes we would be… | Comfy slippers | Sensible sandals | Matching sneakers | Shiny party heels
Our love language is mostly… | Quality time | Kind words | Gifts and treats | Hugs and touch
The best gift we can give each other is… | Time | A thoughtful note | A surprise | A trip
A perfect picnic needs… | Sandwiches | Fruit | Meat pie and juice | Music and games
When we cook together… | It is calm | One cooks, one tastes | It is a competition | The kitchen is a mess
The most fun we have had was… | A quiet night in | A long walk | A road trip | A wild party
Our ideal holiday is… | Relaxing by a pool | Visiting family | Exploring a city | An adventure in the wild
If we were animals we would be… | Two pandas | Two penguins | Two lovebirds | Two monkeys
Our TV remote is controlled by… | Whoever has it first | We take turns | The one who pays the bill | Nobody, we fight
The thing we laugh about most is… | Silly faces | Funny videos | Our own stories | Each other
We could eat this every day… | Rice | Bread | Suya | Pizza
Our dream garden has… | Flowers | Vegetables | Fruit trees | A hammock and a grill
If we sang a duet it would be… | A worship song | A Celine Dion classic | A P-Square song | A rap battle
A day off together means… | Rest | Errands | A date | Something new
Our kitchen always has… | Rice | Indomie | Plantain | Pepper
If we wrote a book it would be about… | Our love story | Cooking | Travel | Funny stories
Our perfect weather for a date is… | Cool evening | Sunny afternoon | Light rain | A starry night
When the light goes off we… | Sleep early | Light candles and talk | Gist in the dark | Start the generator and keep going
We would win a game show about… | Each other | Food | Music | Nollywood
If we had matching tattoos they would be… | No tattoos for us | Tiny hearts | Our initials | Something huge and bold
Our love started with… | A friendship | A long chat | A look | A dare
The perfect evening walk ends with… | Home and bed | Ice cream | Suya | A spontaneous dance
If we lived in a film we would live in… | A countryside cottage | A Nollywood family drama | A Lagos romcom | An action movie
The first thing we do after a long day is… | Lie down | Talk about our day | Eat | Plan something fun
Our favourite thing to share is… | A blanket | Dessert | Music | Secrets
On a Friday night you will find us… | At home | At a friend's house | At a restaurant | On the dance floor
Our relationship playlist has… | Love songs | Old school | Afrobeats | Everything mixed up
If we started a YouTube channel it would be about… | Cooking | Travel | Couple challenges | Pranks
The best breakfast in bed has… | Tea and bread | Yam and egg | Pancakes | A full English
Our perfect home is… | A cosy flat | A family house | A beach house | A city penthouse
We are happiest when we are… | Resting | Eating | Laughing | Exploring
When we visit family we… | Help in the kitchen | Sit and gist | Play with the kids | Run the party
The thing we never agree on is… | Room temperature | What to eat | What to watch | Who is the better driver
If we were a dance we would be… | A slow dance | A two-step | Shaku shaku | Breakdancing
Our perfect night ends with… | Prayer and sleep | A long talk | A midnight snack | Another plan
`,
  scale: `
How much do you love sleeping in? | Up at dawn | Do not wake me
How much do you enjoy cooking? | I burn water | Master chef
How spicy do you like your food? | No pepper please | Bring the scotch bonnets
How much do you love surprises? | Hate them | Live for them
How much of a cuddler are you? | Personal space please | Human blanket
How tidy are you? | Messy | Spotless
How much do you love dancing? | Two left feet | First on the floor
How organised are you with plans? | Wing it | Spreadsheet
How much do you hate being late? | Not bothered | It ruins my day
How much do you sing in the shower? | Never | Full concert
How good are you at keeping secrets? | Terrible | A vault
How much do you love sweet things? | Not my thing | Sugar is life
How patient are you in traffic? | I shout at everyone | Zen master
How much do you enjoy parties? | Home is better | Party animal
How much do you like animals? | Keep them away | I want ten pets
How much do you talk in the morning? | Silent | Chatterbox
How competitive are you at games? | Just for fun | I must win
How good are you at saving money? | Spend it all | Saver
How much do you love taking photos? | Rarely | Every moment
How adventurous are you with food? | Same meal always | Will try anything
How much do you love road trips? | Get me there fast | The journey is the fun
How good are you at directions? | Lost everywhere | Human GPS
How sentimental are you? | Throw it away | Keep every ticket stub
How much do you laugh at your own jokes? | Never | Always first to laugh
How much do you love Christmas? | Just another day | Lights up in November
How loud are you on the phone? | Whisper | Whole street can hear
How often do you check your phone? | Barely | Every minute
How chatty are you with strangers? | Keep to myself | Best friends in five minutes
How much do you like early mornings? | Hate them | Love them
How much do you enjoy shopping? | A chore | Therapy
How handy are you at fixing things? | Call someone | I fix it all
How much do you love reading? | Not a reader | Bookworm
How dramatic are you when you are sick? | Silent sufferer | Write my will
How good are you at remembering birthdays? | Always forget | Never miss one
How much do you plan meals ahead? | Day by day | Whole week sorted
How easily do you get bored? | Never bored | Bored in minutes
How much do you love rain? | Hate it | Pure joy
How much do you enjoy gardening? | Plants die near me | Green fingers
How messy is your bag? | Neat | A black hole
How much do you love trying new restaurants? | My usual spot | Always somewhere new
How good are you at cooking jollof? | Please do not | Party jollof champion
How much do you enjoy family gatherings? | Draining | Favourite thing
How much do you get lost in TV shows? | I can stop anytime | One more episode forever
How brave are you with scary films? | Cannot watch | Laugh at them
How much do you love the beach? | Sand everywhere, no | Beach every weekend
How much do you love kids? | Not for me | Give me all the babies
How good are you at dancing? | Embarrassing | Pro
How much do you hum or whistle? | Never | All day long
How much do you enjoy long walks? | Where is the car? | Walk all day
How fussy are you about food? | Eat anything | Very picky
How much do you love giving gifts? | Not really | Best part of my life
How talkative are you on a date? | Good listener | Talk nonstop
How much do you hate mosquitoes? | They are fine | Sworn enemies
How much of a foodie are you? | Food is fuel | Food is everything
How quickly do you reply to texts? | Days later | Seconds
How much do you love babies' cheeks? | Meh | Must squeeze
How excited do you get about your birthday? | Just a day | Birthday month
How much do you love afternoon naps? | Waste of time | Sacred
How much do you enjoy doing chores? | Hate them | Oddly satisfying
How good is your memory? | Goldfish | Elephant
How much do you love musicals? | Please stop singing | Know every song
How good are you at telling jokes? | Never land | Comedian
How easily do you cry at films? | Never | Every single time
How comfortable are you with heights? | Terrified | Take me higher
How much do you care about matching outfits? | Never | Always coordinated
How messy do you eat? | Neat | Sauce everywhere
How much do you enjoy hosting guests? | Stressful | Love it
How much do you hate cold food? | It is fine | Warm it now
How often do you snack at night? | Never | Every night
How punctual are you to church or mosque? | Last row, late | Front row, early
How much do you love selfies? | Avoid them | Selfie expert
How much do you sing along in the car? | Silent passenger | Full concert
How good are you at board games? | Always lose | Undefeated
How much do you love fresh flowers? | Not bothered | Always want more
How much do you love surprises on your birthday? | Please no | The bigger the better
How much do you love cartoons as an adult? | Not at all | Still my favourite
How good are you at waking up on time? | Snooze king | Up before the alarm
How chill are you on holiday? | Busy schedule | Pool all day
How much do you love spicy suya? | Mild please | Extra yaji
`,
  likely: `
fall asleep during a movie
eat the last piece of chicken
burn the rice
cry at a wedding
forget where they parked
get lost in a new city
talk to a stranger for an hour
dance at a party first
eat dessert before dinner
sing loudly in the car
spend too long in the shower
start a food fight
keep a plant alive
adopt a stray cat
forget a birthday
lose their phone in the house
laugh at the wrong moment
snore the loudest
steal the blanket at night
apologise first after a fight
be late to their own party
plan a surprise
buy something they do not need
talk to their pet like a baby
win at Ludo
cheat at Whot
be the first to say I love you
ask for directions
finish a whole pack of chin chin
take a hundred selfies
cry at a cartoon
fall for a prank
start a dance battle at an owambe
pack too many clothes for a trip
wake up first
make breakfast in bed
order the same food every time
try the weirdest thing on the menu
befriend the waiter
keep every birthday card
lose the TV remote
remember the anniversary date
get the giggles in church
argue with the GPS
sleep through an alarm
get hungry an hour after eating
eat the other person's snacks
sing the wrong lyrics confidently
cry when the food is too spicy
check the oven three times
start a conversation in a lift
hug for too long
leave a cupboard open
befriend the neighbour's dog
binge a whole series in a day
be a morning person
do a silly dance to make the other laugh
hide snacks
get sunburnt on holiday
stop to pet every dog
need a nap on a road trip
get scared at a horror movie
spend all day in pyjamas
change the radio station mid song
leave voice notes longer than two minutes
haggle in the market
remember every song lyric
take the longest to choose from a menu
leave the light on
forget why they walked into a room
send a text to the wrong person
cry during a Nollywood movie
trip over nothing
get emotional at a baby video
start a karaoke night
know all the neighbours' names
fall asleep first
be ticklish
eat cereal at night
lose their keys
drink from the other person's cup
make up a silly song
buy flowers for no reason
plan the next holiday
make the bed in the morning
win a staring contest
rescue a spider instead of killing it
give the best hugs
talk in their sleep
answer a question with another question
ask what is for dinner at breakfast
get excited about a new kitchen gadget
forget to reply to a message
dance while cooking
get distracted by a cute baby
make friends with the security man
know every Nollywood actor's name
send good morning texts
save the last bite for the other
mispronounce a fancy menu item
cry happy tears
be the family favourite
laugh until they snort
keep a secret stash of sweets
start planning Christmas early
name the car
complain about the cold
`
};
