export interface ExperienceItem {
  role: string;
  company: string;
  period: string;
  location?: string;
  description: string;
  achievements: string[];
  skillsUsed: string[];
}

export interface SkillCategory {
  title: string;
  items: string[];
}

export const MAHNOOR_PROFILE = {
  name: "Mahnoor Tabassam",
  title: "Data Analyst",
  location: "Tallinn, Estonia",
  email: "mahnoortabassam@proton.me",
  phone: "+372 54291841",
  linkedin: "https://linkedin.com/in/mahnoor-tabassam",
  resumePdfUrl: "/assets/aistudio/Mahnoor_Tabassam_Resume-2_492c9196.pdf",
  bio: "Data Analyst with proven expertise in building end-to-end Power BI KPI dashboards, star schema modeling, advanced DAX, multi-source SQL ETL (Snowflake, SharePoint, Excel, Power Apps), Python, and automated E2E & API quality engineering.",
  education: {
    degree: "Bachelor of Arts, Impactful Entrepreneurship",
    institution: "Estonian Business School (EBS)",
    period: "2024 – 2027",
    location: "Tallinn, Estonia"
  },
  languages: [
    { language: "English", proficiency: "Native" }
  ],
  experiences: [
    {
      role: "Improvement Lead Trainee",
      company: "Ericsson",
      period: "May 2026 – August 2026",
      description: "Automated manual data tracking and delivered real-time analytics for the Test Technology department.",
      achievements: [
        "Designed and developed a Power BI KPI dashboard from scratch to automate manual data entry for product test tracking, applying star schema data modeling, DAX measures, and Power Query transformations.",
        "Integrated multi-source data from Snowflake, SharePoint, Excel, and Power Apps using optimized SQL queries and DAX measures, eliminating manual data entry and delivering real-time reporting.",
        "Led stakeholder communication across dashboard shareholders including Test Project Managers, Program Managers, and Line Managers to define requirements, align on KPI definitions, and guarantee quality standards."
      ],
      skillsUsed: ["Power BI", "DAX", "Star Schema", "Power Query", "SQL", "Snowflake", "SharePoint", "Power Apps", "Excel"]
    },
    {
      role: "Quality Assurance Intern",
      company: "Reetro (Agile Retrospective Tool)",
      period: "October 2024 – February 2025",
      description: "Spearheaded test automation and critical defect reduction for an agile retrospective product.",
      achievements: [
        "Achieved efficient automated testing for production, improving test coverage and accelerating issue detection, initially utilizing Selenium IDE then advancing to Playwright for API automation.",
        "Slashed critical defects in production by 25% by implementing Playwright for end-to-end (E2E) testing, significantly elevating platform reliability.",
        "Performed module, integration, and system-level testing, authoring clear bug reports for manual and automated verification."
      ],
      skillsUsed: ["Playwright", "Selenium IDE", "API Testing", "E2E Testing", "System Testing", "Bug Reporting"]
    },
    {
      role: "Participant, WiseWomenCode 2026",
      company: "Wise",
      period: "18 – 20 February 2026",
      description: "Selected participant for an intensive 3-day technical & professional development program at global fintech leader Wise.",
      achievements: [
        "Learned and coded in Java with hands-on 1-on-1 guidance from a software engineer at Wise.",
        "Attended specialized technical workshops in Artificial Intelligence (AI) and Machine Learning (ML).",
        "Work-shadowed a senior platform engineer, exploring Platform Engineering, backend architecture, cluster management, and Docker.",
        "Explored core concepts in cybersecurity, incident handling, and scalable data algorithms."
      ],
      skillsUsed: ["Java", "Docker", "Platform Engineering", "AI & ML", "Data Algorithms", "Cybersecurity"]
    }
  ],
  skillCategories: [
    {
      title: "Data Visualisation & BI",
      items: ["Power BI (DAX, Power Query, Star Schema)", "Power Apps", "Dashboard Design", "Interactive Reporting"]
    },
    {
      title: "Databases & Querying",
      items: ["SQL", "Snowflake", "SharePoint Data", "Excel Modeling", "ETL Pipelines"]
    },
    {
      title: "Programming & Automation",
      items: ["Python", "Playwright", "Selenium IDE", "API Automation", "E2E Testing", "Java Fundamentals"]
    },
    {
      title: "Data & Analytical Skills",
      items: ["KPI Design & Tracking", "Data Modelling (Star Schema)", "Multi-source ETL Integration", "Data Quality Assurance", "Requirement Gathering & Analysis"]
    },
    {
      title: "Soft & Leadership Skills",
      items: ["Stakeholder Communication & Management", "Cross-functional Collaboration", "Process Improvement", "Agile Methodology"]
    }
  ],
  samplePrompts: [
    "How did Mahnoor build the Power BI KPI dashboard from scratch at Ericsson?",
    "Explain her Star Schema data modeling and DAX measures expertise.",
    "How did Mahnoor integrate Snowflake, SharePoint, and Power Apps using SQL?",
    "Tell me about Mahnoor's core data analytics stack and methodologies.",
    "How did she reduce critical production defects by 25% at Reetro?",
    "How can I contact or hire Mahnoor for data analyst roles?"
  ]
};
