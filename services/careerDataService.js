const fs = require('fs');
const path = require('path');
const logger = require('../middleware/logger');

// Load default career data
const class10Careers = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'class10Careers.json'), 'utf8')
);
const class12Careers = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'class12Careers.json'), 'utf8')
);

/**
 * Get default career recommendations based on user data
 */
exports.getDefaultCareerRecommendations = (userData) => {
  let defaultCareers = [];

  // Now data has been standardized in controller
  // qualification will be "Class 10" or "Class 12"
  // stream will be "Science", "Commerce", or "Arts"
  // subjects will include "PCM" or "PCB" for Science stream

  if (userData.qualification === "Class 10") {
    // Ensure stream exists for Class 10 data structure or handle gracefully
    defaultCareers = (class10Careers && class10Careers[userData.stream]) || [];
    
    // If user selected after10th=diploma or after10th=iti, try to filter to more relevant careers
    if (userData.after10th === "diploma" || userData.after10th === "iti") {
      // If there are specific diploma/ITI categories in class10Careers, use those
      const after10thCareers = class10Careers[userData.after10th];
      if (after10thCareers && after10thCareers.length > 0) {
        defaultCareers = after10thCareers;
      }
      // Otherwise, default careers will remain as they were
    }
  } else if (userData.qualification === "Class 12") {
    const streamData = class12Careers && class12Careers[userData.stream];
    if (!streamData) return [];

    if (userData.stream === "Science") {
      // Now subjects might contain "PCM" or "PCB" at the start,
      // so we check if it includes either of these substrings
      defaultCareers =
        userData.subjects && userData.subjects.includes("PCB")
          ? streamData.PCB || []
          : streamData.PCM || [];
    } else if (userData.stream === "Commerce") {
      defaultCareers =
        userData.subjects && userData.subjects.includes("Mathematics")
          ? streamData["With Mathematics"] || []
          : streamData["Without Mathematics"] || [];
    } else if (userData.stream === "Arts") {
      defaultCareers =
        userData.subjects && userData.subjects.includes("Fine Arts")
          ? streamData["Fine Arts"] || []
          : streamData["Humanities"] || [];
    } else {
        defaultCareers = []; // Handle unknown stream for Class 12
    }
  } else {
      defaultCareers = []; // Handle unknown qualification
  }

  // Filter based on higher studies preference
  if (userData.higherStudies === "Yes") {
    defaultCareers = defaultCareers.filter(
      (career) => career.path_type === "higher_education"
    );
  } else if (userData.higherStudies === "No") { // Explicitly check for "No"
    defaultCareers = defaultCareers.filter(
      (career) => career.path_type === "immediate"
    );
  }

  // Consider interests if available
  if (userData.interests && userData.interests.length > 0) {
    // Optional: Try to prioritize careers that match user interests
    // This is a simple implementation - you might want to enhance this logic
    const interestsLower = userData.interests.map(i => i.toLowerCase());
    
    defaultCareers.sort((a, b) => {
      // Check if career title or description contains any interest keywords
      const aMatches = interestsLower.some(interest => 
        (a.title && a.title.toLowerCase().includes(interest)) || 
        (a.description && a.description.toLowerCase().includes(interest))
      );
      
      const bMatches = interestsLower.some(interest => 
        (b.title && b.title.toLowerCase().includes(interest)) || 
        (b.description && b.description.toLowerCase().includes(interest))
      );
      
      if (aMatches && !bMatches) return -1;
      if (!aMatches && bMatches) return 1;
      
      // If both or neither match interests, sort by salary as before
      return (b.salary_max || 0) - (a.salary_max || 0);
    });
  } else {
    // Sort by salary (highest first) if no interests to consider
    defaultCareers.sort((a, b) => {
      return (b.salary_max || 0) - (a.salary_max || 0);
    });
  }

  return defaultCareers.slice(0, 6);
};

/**
 * Search through all career data with a query
 */
exports.searchCareers = (query) => {
  // Collect career data from both Class 10 and Class 12 career files
  let allCareers = [];
  
  // Collect from Class 10 careers
  if (class10Careers) {
    Object.values(class10Careers).forEach(careers => {
      if (Array.isArray(careers)) {
        allCareers = allCareers.concat(careers);
      }
    });
  }
  
  // Collect from Class 12 careers
  if (class12Careers) {
    Object.values(class12Careers).forEach(streamData => {
      if (typeof streamData === 'object' && streamData !== null) {
        Object.values(streamData).forEach(careers => {
          if (Array.isArray(careers)) {
            allCareers = allCareers.concat(careers);
          }
        });
      }
    });
  }

  // Normalize the query
  const normalizedQuery = query.trim().toLowerCase();
  const queryTerms = normalizedQuery.split(/\s+/).filter(term => term.length > 2);
  
  // Filter careers by search query
  const results = allCareers.filter(career => {
    // Check for exact title match first (highest priority)
    if (career.title && career.title.toLowerCase() === normalizedQuery) {
      career.relevanceScore = 100;
      return true;
    }
    
    // Calculate a relevance score based on matches
    let score = 0;
    
    // Title matches (high weight)
    if (career.title) {
      const titleLower = career.title.toLowerCase();
      if (titleLower.includes(normalizedQuery)) {
        score += 50; // Complete phrase match in title
      } else {
        // Check for individual term matches in title
        queryTerms.forEach(term => {
          if (titleLower.includes(term)) {
            score += 30; // Individual term match in title
          }
        });
      }
    }
    
    // Description matches (medium weight)
    if (career.description) {
      const descLower = career.description.toLowerCase();
      if (descLower.includes(normalizedQuery)) {
        score += 25; // Complete phrase match in description
      } else {
        // Check for individual term matches in description
        queryTerms.forEach(term => {
          if (descLower.includes(term)) {
            score += 15; // Individual term match in description
          }
        });
      }
    }
    
    // Requirements matches (medium weight)
    if (career.requirements) {
      let requirementsText = "";
      if (Array.isArray(career.requirements)) {
        requirementsText = career.requirements.join(" ").toLowerCase();
      } else {
        requirementsText = career.requirements.toLowerCase();
      }
      
      if (requirementsText.includes(normalizedQuery)) {
        score += 20;
      } else {
        queryTerms.forEach(term => {
          if (requirementsText.includes(term)) {
            score += 10;
          }
        });
      }
    }
    
    // Skills matches (medium weight)
    if (career.skills) {
      let skillsText = "";
      if (Array.isArray(career.skills)) {
        skillsText = career.skills.join(" ").toLowerCase();
      } else {
        skillsText = career.skills.toLowerCase();
      }
      
      if (skillsText.includes(normalizedQuery)) {
        score += 25;
      } else {
        queryTerms.forEach(term => {
          if (skillsText.includes(term)) {
            score += 15;
          }
        });
      }
    }
    
    // Store the relevance score on the career object
    career.relevanceScore = score;
    
    // Return true if the career is relevant enough
    return score > 10;
  });
  
  // Remove duplicates (based on title) and keep highest scoring version
  const uniqueTitles = new Map();
  
  results.forEach(career => {
    const existingCareer = uniqueTitles.get(career.title);
    if (!existingCareer || existingCareer.relevanceScore < career.relevanceScore) {
      uniqueTitles.set(career.title, career);
    }
  });
  
  // Convert map back to array and sort by relevance score
  const uniqueResults = Array.from(uniqueTitles.values()).sort((a, b) => {
    return b.relevanceScore - a.relevanceScore;
  });
  
  return uniqueResults;
}; 