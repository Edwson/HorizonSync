HorizonSync
Turn time zones into your competitive advantage with intelligent global team coordination.

Overview
HorizonSync is a smart global team coordination tool that transforms timezone challenges into workflow opportunities. Instead of just showing world clocks, it uses AI to suggest optimal team structures for 24-hour productivity cycles, seamless handoffs, and strategic hiring decisions.
Key Innovation: Turn "timezone problems" into "workflow solutions" through intelligent analysis and recommendations.
Features
🌍 Smart Timezone Management

Real-time multi-timezone clocks with work hours visualization
Automatic local timezone detection
Custom work schedule support (flexible hours, not just 9-5)
Visual indicators for active/inactive team hours

🤖 AI-Powered Optimization

Intelligent hiring location recommendations
24-hour coverage analysis and optimization
Workflow handoff efficiency scoring
Strategic team expansion suggestions

🎯 Visual Workflow Canvas

Interactive team workflow mapping
Drag-and-drop process visualization
Connection-based dependency tracking
Export/import workflow configurations

📅 Global Event Scheduling

Multi-timezone meeting optimization
Automatic timezone conversion
Conflict detection and resolution
Fair rotation scheduling to balance timezone burden

📊 Analytics & Insights

Team coverage metrics (hours/day covered)
Handoff efficiency calculations
Productivity scoring
Strategic recommendations dashboard

🌐 International Ready

6 language support (English, French, German, Japanese, Chinese, Arabic)
RTL language support
Cultural work pattern awareness
Locale-specific formatting

Quick Start
Prerequisites

Modern web browser (Chrome, Firefox, Safari, Edge)
Web server with PHP 7.4+ (for AI features)
Optional: Gemini API key for AI recommendations

Installation

Clone the repository

bashgit clone https://github.com/yourusername/horizonsync.git
cd horizonsync

Set up the web server

bash# Using PHP built-in server (development)
php -S localhost:8000

# Or configure your preferred web server to serve the files

Configure AI features (optional)

bash# Copy and edit the PHP configuration
export GEMINI_API_KEY="your-api-key-here"

Open in browser

http://localhost:8000
That's it! HorizonSync works entirely in the browser with local data storage.
Usage Examples
Setting Up Your First Global Team

Add Your Local Location

HorizonSync auto-detects your timezone
Configure your team's work hours
Set team size and role


Add Remote Team Members

Use the location search to add team cities
Configure work hours for each location
Specify team roles (Development, QA, Design, Support)


Get AI Recommendations

Ask: "How can I achieve 24-hour coverage?"
Get specific timezone and hiring suggestions
Implement recommended team structure



Example AI Interactions
User: "We need 24-hour development coverage"
AI: "Your current coverage is 16 hours. Consider hiring in Central Europe (GMT+1) 
     for 2-hour overlap with your Taipei team and 4-hour overlap with potential 
     US East Coast expansion."

User: "Where should I hire my next QA engineer?"
AI: "Based on your current Taipei development team (7:00-16:00), London 
     (9:00-17:00) would create a perfect handoff window at 15:00-16:00 Taipei time."
Project Structure
horizonsync/
├── index.html              # Main application entry
├── style.css              # Complete styling and theme system
├── script.js              # Core application logic and state management
├── ai-proxy.php           # Backend AI integration (Gemini API)
└── README.md             # This file
Technical Architecture
Frontend Architecture

Vanilla JavaScript: No framework dependencies for maximum compatibility
Component-based UI: Modular design with reusable components
State Management: Centralized application state with event-driven updates
Local Storage: All data persisted locally with import/export capabilities

Key Technologies

Moment.js + Timezone: Accurate timezone calculations and conversions
GSAP: Smooth animations and transitions
Interact.js: Drag-and-drop workflow canvas functionality
CSS Custom Properties: Dynamic theming and responsive design

AI Integration

Gemini API: Powers intelligent recommendations
PHP Proxy: Secure API key management with rate limiting
Fallback System: Graceful degradation when AI is unavailable

Configuration
Environment Variables
bash# Required for AI features
GEMINI_API_KEY=your_gemini_api_key_here

# Optional configurations
DEBUG=true                    # Enable debug logging
RATE_LIMIT_HOUR=50           # Requests per hour per IP
RATE_LIMIT_DAY=500          # Requests per day per IP
Customization

Themes: Light/dark theme with CSS custom properties
Languages: Add new translations in script.js translations object
Timezones: Extend timezone data in timezoneData array
AI Prompts: Modify AI prompt templates in buildOptimizedPrompt()

API Reference
Core Functions
Team Management
javascript// Add new team location
addTeamLocation({
    timezone: 'Europe/London',
    city: 'London',
    role: 'development',
    teamSize: 3,
    workHours: { start: 9, end: 17 }
});

// Calculate coverage hours
const coverage = calculateCoverageHours(); // Returns 0-24
AI Integration
javascript// Get AI recommendation
const response = await callAI(
    "How can I achieve 24-hour coverage?",
    buildAIContext()
);
Workflow Canvas
javascript// Add workflow card
addWorkflowCard({
    type: 'process',
    title: 'Code Review',
    content: 'Daily code review process'
});

// Create connections between cards
addWorkflowConnection(startCardId, endCardId);
Contributing
We welcome contributions! Here's how to get started:
Development Setup

Fork and clone

bashgit clone https://github.com/yourusername/horizonsync.git
cd horizonsync

Create a feature branch

bashgit checkout -b feature/your-feature-name

Make your changes

Follow existing code style and patterns
Test across different browsers
Ensure responsive design works


Test your changes

Test with multiple timezones
Verify AI integration works
Check internationalization


Submit a pull request

Code Style Guidelines

JavaScript: ES6+ features, consistent naming conventions
CSS: BEM-like naming, CSS custom properties for theming
PHP: PSR standards, proper error handling

Areas for Contribution

New AI Features: Enhanced optimization algorithms
Internationalization: Additional language support
Integrations: Calendar systems, Slack, Microsoft Teams
Mobile Experience: Native mobile app development
Analytics: Advanced team performance metrics

Roadmap
Version 2.0 (Planned)

 Calendar system integrations (Google Calendar, Outlook)
 Real-time collaboration features
 Advanced analytics with historical data
 Team performance tracking
 Mobile-first responsive redesign

Version 2.1 (Future)

 Slack/Teams integration
 Advanced AI models for optimization
 Multi-company workspace support
 API for third-party integrations

FAQ
Q: Does HorizonSync require an internet connection?
A: The core functionality works offline. AI features require internet for API access.
Q: Is my team data secure?
A: All data is stored locally in your browser. No data is sent to servers except for AI requests (which are anonymized).
Q: Can I use this for non-tech teams?
A: Absolutely! HorizonSync works for any distributed team: customer support, marketing, sales, etc.
Q: How accurate are the timezone calculations?
A: Very accurate. We use Moment.js with official timezone data, including automatic DST handling.
License
This project is licensed under the MIT License - see the LICENSE file for details.
Support

Issues: Report bugs or request features via GitHub Issues
Discussions: Join conversations in GitHub Discussions
Documentation: Check the Wiki for detailed guides

Acknowledgments

Built By Ed Chen linkedin(https://www.linkedin.com/in/ed-chen-saas/) Website(https://edwson.com)
Timezone data provided by the IANA Time Zone Database
AI powered by Google Gemini
Icons by Tabler Icons


Made for teams who turn the sun into their competitive advantage.