

"use strict";

// ========================================
// 1. CITY DATA
// ========================================

const cities = {
  delhi: {
    name: "Delhi",
    latitude: 28.6139,
    longitude: 77.2090
  },
  mumbai: {
    name: "Mumbai",
    latitude: 19.0760,
    longitude: 72.8777
  },
  bengaluru: {
    name: "Bengaluru",
    latitude: 12.9716,
    longitude: 77.5946
  },
  chennai: {
    name: "Chennai",
    latitude: 13.0827,
    longitude: 80.2707
  },
  kolkata: {
    name: "Kolkata",
    latitude: 22.5726,
    longitude: 88.3639
  }
};

// ========================================
// 2. HTML ELEMENTS
// ========================================

const citySelect = document.getElementById("citySelect");
const refreshBtn = document.getElementById("refreshBtn");

const locationHeading = document.getElementById("location");
const updatedElement = document.getElementById("updated");
const aqiElement = document.getElementById("aqi");
const categoryElement = document.getElementById("category");
const descriptionElement = document.getElementById("description");
const pm25Element = document.getElementById("pm25");
const pm10Element = document.getElementById("pm10");
const recommendationElement = document.getElementById("recommendation");
const errorElement = document.getElementById("error");

const comparisonGrid = document.getElementById("comparisonGrid");
const comparisonStatus = document.getElementById("comparisonStatus");
const compareBtn = document.getElementById("compareBtn");

// ========================================
// 3. AQI CATEGORIES AND ADVICE
// ========================================

function getAirAdvice(aqi) {
  if (aqi <= 50) {
    return {
      category: "Good",
      description: "Air pollution poses little risk under this AQI scale.",
      advice: "Enjoy outdoor activities if you feel well."
    };
  }

  if (aqi <= 100) {
    return {
      category: "Moderate",
      description:
        "Air quality is generally acceptable, though unusually sensitive people may be affected.",
      advice:
        "Most people can continue normal activities. Sensitive individuals should monitor symptoms."
    };
  }

  if (aqi <= 150) {
    return {
      category: "Unhealthy for Sensitive Groups",
      description: "Sensitive people may experience health effects.",
      advice:
        "Children and people with respiratory conditions should reduce prolonged or strenuous outdoor exertion."
    };
  }

  if (aqi <= 200) {
    return {
      category: "Unhealthy",
      description:
        "Health effects are possible for everyone, especially sensitive groups.",
      advice:
        "Consider reducing prolonged outdoor exertion and follow local health advisories."
    };
  }

  if (aqi <= 300) {
    return {
      category: "Very Unhealthy",
      description: "The risk of health effects is increased.",
      advice:
        "Avoid strenuous outdoor activities and follow local public-health guidance."
    };
  }

  return {
    category: "Hazardous",
    description: "This indicates a serious air-quality risk.",
    advice:
      "Avoid outdoor exertion, seek cleaner indoor air if possible, and follow official local advisories."
  };
}

// ========================================
// 4. HELPER FUNCTIONS
// ========================================

function formatNumber(value, decimals = 1) {
  return Number.isFinite(value)
    ? value.toFixed(decimals)
    : "Unavailable";
}

function buildApiUrl(city) {
  return (
    "https://air-quality-api.open-meteo.com/v1/air-quality" +
    `?latitude=${city.latitude}` +
    `&longitude=${city.longitude}` +
    "&current=us_aqi,pm2_5,pm10&timezone=auto"
  );
}

async function fetchCityAirQuality(city) {
  const response = await fetch(buildApiUrl(city));

  if (!response.ok) {
    throw new Error(
      `${city.name}: API request failed (${response.status})`
    );
  }

  const data = await response.json();
  const current = data.current;

  if (!current || !Number.isFinite(current.us_aqi)) {
    throw new Error(`${city.name}: AQI data is unavailable.`);
  }

  return {
    city,
    current,
    timezone: data.timezone || "local time"
  };
}

// ========================================
// 5. MAIN CITY DASHBOARD
// ========================================

async function loadAirQuality() {
  const city = cities[citySelect.value];

  if (!city) {
    errorElement.textContent = "Please select a valid city.";
    return;
  }

  refreshBtn.disabled = true;
  refreshBtn.textContent = "Loading...";
  errorElement.textContent = "";

  locationHeading.textContent = `${city.name}, India`;
  updatedElement.textContent = "Fetching the latest available reading...";

  try {
    const result = await fetchCityAirQuality(city);
    const { current, timezone } = result;
    const advice = getAirAdvice(current.us_aqi);

    aqiElement.textContent = Math.round(current.us_aqi);
    categoryElement.textContent = advice.category;
    descriptionElement.textContent = advice.description;
    recommendationElement.textContent = advice.advice;

    pm25Element.textContent = formatNumber(current.pm2_5);
    pm10Element.textContent = formatNumber(current.pm10);

    updatedElement.textContent = current.time
      ? `Reading time: ${current.time} (${timezone})`
      : "Reading time unavailable.";

  } catch (error) {
    console.error("Dashboard error:", error);

    aqiElement.textContent = "--";
    categoryElement.textContent = "Data unavailable";
    descriptionElement.textContent =
      "A current air-quality reading could not be retrieved.";

    pm25Element.textContent = "--";
    pm10Element.textContent = "--";

    recommendationElement.textContent =
      "Check an official local air-quality source before making outdoor activity decisions.";

    updatedElement.textContent = "Unable to retrieve a reading.";

    errorElement.textContent =
      "Could not load air-quality data. Check your internet connection and retry.";
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.textContent = "Refresh air quality";
  }
}

// ========================================
// 6. CITY COMPARISON
// ========================================

async function loadCityComparison() {
  if (!comparisonGrid || !comparisonStatus || !compareBtn) {
    console.error(
      "Comparison HTML elements are missing. Check index.html IDs."
    );
    return;
  }

  compareBtn.disabled = true;
  compareBtn.textContent = "Loading...";
  comparisonStatus.textContent =
    "Fetching air-quality readings for five cities...";

  comparisonGrid.replaceChildren();

  try {
    const cityEntries = Object.values(cities);

    const results = await Promise.allSettled(
      cityEntries.map(city => fetchCityAirQuality(city))
    );

    const successful = results
      .filter(result => result.status === "fulfilled")
      .map(result => result.value)
      .sort(
        (a, b) => a.current.us_aqi - b.current.us_aqi
      );

    const failedCount = results.length - successful.length;

    if (successful.length === 0) {
      throw new Error("No city readings are currently available.");
    }

    successful.forEach((result, index) => {
      const { city, current } = result;
      const advice = getAirAdvice(current.us_aqi);

      const card = document.createElement("article");
      card.className = "city-card";

      if (index === 0) {
        card.classList.add("cleanest");
      }

      const heading = document.createElement("h3");
      heading.textContent = city.name;

      const aqi = document.createElement("div");
      aqi.className = "city-aqi";
      aqi.textContent = Math.round(current.us_aqi);

      const category = document.createElement("p");
      category.className = "city-category";
      category.textContent = advice.category;

      const details = document.createElement("p");
      details.className = "city-details";
      details.textContent =
        `PM2.5: ${formatNumber(current.pm2_5)} µg/m³ · ` +
        `PM10: ${formatNumber(current.pm10)} µg/m³`;

      card.append(heading, aqi, category, details);

      if (index === 0) {
        const tag = document.createElement("p");
        tag.textContent = "Lowest AQI in this comparison";
        card.append(tag);
      }

      comparisonGrid.append(card);
    });

    comparisonStatus.textContent =
      `Showing ${successful.length} of ${results.length} cities, ` +
      "ranked from lowest to highest US AQI." +
      (failedCount > 0
        ? ` ${failedCount} city reading(s) could not be retrieved.`
        : "");

  } catch (error) {
    console.error("City comparison error:", error);

    comparisonStatus.textContent =
      "Could not load city comparison. Check your connection and try again.";

  } finally {
    compareBtn.disabled = false;
    compareBtn.textContent = "Refresh comparison";
  }
}

// ========================================
// 7. EVENT LISTENERS
// ========================================

citySelect.addEventListener("change", loadAirQuality);
refreshBtn.addEventListener("click", loadAirQuality);
compareBtn.addEventListener("click", loadCityComparison);

// ========================================
// 8. INITIAL LOAD
// ========================================

loadAirQuality();
loadCityComparison();