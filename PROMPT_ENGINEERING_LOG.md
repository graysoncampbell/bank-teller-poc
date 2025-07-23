Unloan Conversational Agent POC - Chronological Chat Log
Session Start

Me: "Can you help me put together the quickest poc. I want to build a conversational agent for a digital morgage lending company. I really want to wow them with my knowledge of managed rag. Their website is great and already has lots of the information needed to answer a customers need to know set of question and a lot of content that could alleviate customer anxiety about proceeding or enquiring about lending. My gut says phycollogically this is one of the biggest barriers to people enquirying is the worry about specific circumstances of them making them eligible and worrying about the impact on applying with a rejection on their credit. My experience with online lending is being rejected even with a very normal credit history and sufficient lending capacity. So i can imagine people who see this as more of a blackbox would be anxious. I want to put together a POC of managed rag that has a conversation thread. The user can talk to a long running thread with a AI Agent, which acts as a online relationship manager for the bank. The entity uses a next.js, graphql pattern & passwordless auth. Im thinking we could replicate the outrun app passwordless auth with a barebone chat interface, we could keep the chat thread with the customer long term as a running conversation & allow the user to back forth with the banker but using the content from their website to reassure the user, on disqualify them. Leaving them confident. It would be good to upfront let the user know interactions with this agent wont be considered as part of their lending application so they can ask anything. I would like to to scrap their website, build out a vectorised set of knowledge on mongodb, then use the claude api to back/forth with the user answering their questions."


Me: "Can you use type script because that is their bread and butter. Im also goign to assumer for the purposes of this excercise they use the app router. Can you target their sitemap https://www.unloan.com.au/sitemap.xml i would like to scrape everything. I want to use claude for embedding. I need to do this all in one night, so instead of weeks can it be phases."


Me: "I did not relise embedding was not avalaible in claude, lets use gemini instead."


Me: "Sorry can you also throttle so we dont download more than 4 pages a minute. Can you also set the user agent to something that contains my name "Grayson" so if they look they know it was me."

💭 Professional courtesy - want to be identifiable if they check their logs

Me: "Its good, but can you add specific error handling for if rate limiting or autoban is applied to our IP. Just warn me, ill change connection."


Me: "Picking up where you left off, could we run the chunks and pages in parallel"


Me: "Good news: 82 pages processed with 603 embeddings created (averaging 7.4 embeddings per page)."


Me: "Can you have a quick look at outrun-app and containerise the unloan app in the same way."


Me: "Why do i need the frontend layout for scraping?"


Me: "Okay i want you to have a look at unloan.com.au i want to emulate their UI style, type etc, I think providing those references is good, but lets instead supply cards similar to under a "A new kind of home loan", that are in a carousel."


Me: "I dont think you quite nailed the brief, let me more specific. I really liked the conversation being more broken up with specific lines beind displayed seperately, that seems to have reverted. Instead of saying related resources, it would be cool for a chat bubble to say "Here are a couple articles from our website" in a bubble, Then the cards render outside the chat bubble under the text not inside a bubble, the scrolling is perfect. Design wise they use totally rounded edges for buttons and a black button, with a grey hover state. Can you grab those colors from the css file. The carousel cards alternate between light grey and charcoal with huge type. I would like to replice, can you also remove Unloan | which is being fetched from the database because its included in the website meta. Can you look at the ui via the browser mcp so you understand its design better."


Me: "@anthropic-ai/sdk is at version 0.57.0"


Me: "Can you also store the raw page content, so if we changed models we could reuse the data."


Me: "Can the welcome text be in text bubbles like the rest of the content. Hi there! I'm Jane 👋 I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! Try asking: • "What are offset accounts and how do they work?" • "What is LMI and when do I need it?" • "How does LVR affect my interest rate?" • "What are the benefits of Unloan's home loan?""


Me: "This should still be formatted on new lines."


Me: "Specfically i think it would work better in new bubbles"


Me: "Im seeing double. Jane Jane Unloan Banker test3@test.com Logout Hi there! I'm Jane 👋 Hi there! I'm Jane 👋 I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! Try asking: • "What are offset accounts and how do they work?" • "What is LMI and when do I need it?" • "How does LVR affect my interest rate?" • "What are the benefits of Unloan's home loan?" Try asking: • "What are offset accounts and how do they work?" • "What is LMI and when do I need it?" • "How does LVR affect my interest rate?" • "What are the benefits of Unloan's home loan?" Its duplicated the answers."


Me: "Still seeing duplicates"


Me: "When i open a new instance i dont recieve any welcome message at all anymore, i expect the messages from before just using the bubble layout. Hi there! I'm Jane 👋 I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! Try asking: • "What are offset accounts and how do they work?" • "What is LMI and when do I need it?" • "How does LVR affect my interest rate?" • "What are the benefits of Unloan's home loan?""


Me: "Try asking: • "What are offset accounts and how do they work?" • "What is LMI and when do I need it?" • "How does LVR affect my interest rate?" • "What are the benefits of Unloan's home loan?" This should still be formatted on new lines."


Me: "Specfically i think it would work better in new bubbles"


Me: "Im seeing double. Jane Unloan Banker test3@test.com Logout Hi there! I'm Jane 👋 Hi there! I'm Jane 👋 I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! Try asking: Try asking: "What are offset accounts and how do they work?" "What are offset accounts and how do they work?" "What is LMI and when do I need it?" "What is LMI and when do I need it?" "How does LVR affect my interest rate?" "How does LVR affect my interest rate?" "What are the benefits of Unloan's home loan?" "What are the benefits of Unloan's home loan?""


Me: "Still seeing duplicates"


Me: "Commit changes"


Me: "In the card description, is it possible to return the meta description instead of the partial that matches."


Me: "Sorry can you revert the chat window height to what it was before, it was perfect. I was referring the carousel cards."


Me: "Sorry i change my mind, revert the card height, can you just make it slightly higher than the previous height."


Me: "If i come back to the popup after using it, i think after a refresh i seem to get this at the end of my stream. Hi there! I'm Jane 👋 Hi there! I'm Jane 👋 I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! I'm here to help with all your home loan questions. Ask me about rates, features, or anything else about Unloan! We did have some 15 minutes timeout functionality, but i believe it was supposed to say, "welcome back""


Me: [Shared Vercel build error logs] "Running build in Washington, D.C., USA (East) – iad1..."

💭 Production deployment failing - need to get the latest fixes pushed to resolve TypeScript errors

Me: "Can you commit"


Me: "Is this in the package.json file? Failed to compile. ./lib/auth.ts:2:17 Type error: Could not find a declaration file for module 'jsonwebtoken'. '/vercel/path0/node_modules/jsonwebtoken/index.js' implicitly has an 'any' type. Error: Command "npm run build" exited with 1 Exiting build container"

Me: "Sorry Can you restrict login to emails to only emails from unloan.com.au & loonshoot.com, i realised im going to end up with a $9000 gemini bill otherwise."

Me: "Can the error just say your domain is not supported."


Me: "Can you centre Enter Your Email on the login screen."