---
name: Tie
year: 2023
period: Feb–May 2023
role: Technical Product Manager, 5-person team
tags: [neo4j, graphql, react, aws]
summary: "Industry capstone for Jahnel Group: a reciprocal recommender on a Neo4j knowledge graph that ranks applicants and projects for each other."
---

An industry capstone for Jahnel Group, a software consultancy in Schenectady, NY. I was the Technical Product Manager on a 5-person team.

Tie is a reciprocal recommender for staffing. Applicants upload a resume, and hiring managers see the ranked applicants for each project with a match score and their main skills. The client accepted the system, with 40+ applicants and 10+ projects.

The interface is React with Apollo Client, and the API is GraphQL on Apollo Server and Node.js. On AWS, resumes land in S3, and a Lambda function extracts their text with Textract for skill mining. Neo4j stores applicants, projects, and skills as one graph, which makes each recommendation explainable.

## Recommendations

The recommender is hybrid: it combines Cypher graph traversals with embedding similarity. I modeled the skill hierarchy of each applicant and project as an n-ary tree for link prediction.

## Development environment

The services run in containers behind an API gateway, with a CI/CD pipeline. The shared environment saved about 2 weeks of team onboarding.
