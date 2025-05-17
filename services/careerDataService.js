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
  
  // Filter careers by search query
  const results = allCareers.filter(career => {
    // Search in various career fields
    return (
      (career.title && career.title.toLowerCase().includes(query)) ||
      (career.description && career.description.toLowerCase().includes(query)) ||
      (career.requirements && career.requirements.toLowerCase().includes(query)) ||
      (career.skills && 
        (Array.isArray(career.skills) 
          ? career.skills.some(skill => skill.toLowerCase().includes(query))
          : career.skills.toLowerCase().includes(query))
      )
    );
  });
  
  // Remove duplicates (based on title)
  const uniqueResults = Array.from(
    new Map(results.map(item => [item.title, item])).values()
  );
  
  return uniqueResults;
}; 