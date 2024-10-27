// Set the dimensions and margins of the graph
const width = 960;
const height = 600;

// Append the svg object to the body of the page
const svg = d3.select("#choroplethMap")
    .attr("width", "100%")
    .attr("height", "auto")
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

// Function to get the appropriate scale based on screen width
function getScale() {
    const screenWidth = window.innerWidth;
    if (screenWidth < 768) {
        return 100; // Smaller scale for mobile
    } else {
        return 150; // Default scale for larger screens
    }
}

// Function to get the appropriate dimensions for the line chart based on screen width
function getLineChartDimensions() {
    const screenWidth = window.innerWidth;
    if (screenWidth < 768) {
        return { width: screenWidth - 40, height: 300 }; // Smaller dimensions for mobile
    } else {
        return { width: 960, height: 500 }; // Default dimensions for larger screens
    }
}

// Map and projection
const path = d3.geoPath();
const projection = d3.geoMercator()
    .scale(getScale()) // Use the function to set the scale
    .translate([width / 2, height / 1.4]); // Adjust the translation to center the map

// Data and color scale
const data = new Map();
const colorScales = {
    cases: d3.scaleThreshold()
        .domain([10, 100, 1000, 10000, 100000])
        .range(d3.schemeBlues[6]),
    deaths: d3.scaleThreshold()
        .domain([1, 10, 100, 1000, 10000])
        .range(d3.schemeReds[6])
};

let currentMetric = 'cases';
let currentLanguage = 'english';
const dateRanges = [...new Set(covidData.map(entry => entry.Date_reported))];
let currentEndDate = dateRanges.length-1;
let currentEndDate2 = dateRanges[dateRanges.length-1]; 
let topo;
let intervalId = null;

// Function to get the most recent data for each country
function getMostRecentData(data) {
    const mostRecentData = {};
    data.forEach(d => {
        const country = d.Country;
        const date = new Date(d.Date_reported.split('/').reverse().join('-')); // Convert to Date object
        if (!mostRecentData[country] || date > mostRecentData[country].date) {
            mostRecentData[country] = { ...d, date };
        }
    });
    return Object.values(mostRecentData);
}

function getRecentDataOnDate(date) {
    currentEndDate2 = date;
    const dataOnDate = covidData.filter(d => d.Date_reported === date);
    const mappedData = {};
    dataOnDate.forEach(d => {
        mappedData[d.Country] = {
            cases: +d.Cumulative_cases_per_100k,
            deaths: +d.Cumulative_deaths_per_100k
        };
    });
    return mappedData;
}

function filterDataUpToDate(endDate) {
    const parseTime = d3.timeParse("%Y-%m-%d");
    const endDateParts = endDate.split('/');
    const formattedEndDate = `${endDateParts[2]}-${endDateParts[1]}-${endDateParts[0]}`;
    const end = parseTime(formattedEndDate);
    if (!end) {
        console.error("Error parsing end date:", endDate);
        return [];
    }

    // Filter the data up to the end date
    const filteredData = covidData.filter(d => {
        const dateParts = d.Date_reported.split('/');
        const formattedDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
        const date = parseTime(formattedDate);
        return date <= end;
    });

    return filteredData;
}


// Create a tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip");

// Load external data and boot
Promise.all([
    d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
]).then(function(loadData){
    topo = loadData[0];
    drawMap(currentEndDate2);

    // Toggle button event listener for the map
    d3.select("#toggleButton").on("click", function() {
        currentMetric = currentMetric === 'cases' ? 'deaths' : 'cases';
        d3.select("#title").text(currentMetric === 'cases' ? 'Cases per 100,000 inhabitants' : 'Deaths per 100,000 inhabitants');
        d3.select("#toggleButton").text(`Toggle to ${currentMetric === 'cases' ? 'deaths' : 'cases'}`);
        setLanguage(currentLanguage);
        drawMap(currentEndDate2);
    });

    // Redraw the map on window resize
    window.addEventListener('resize', function() {
        projection.scale(getScale());
        drawMap(currentEndDate2);
    });

    // Draw the multi-line chart
    drawLineChart(currentEndDate2);
});


// Draw the map
function drawMap(currentEndDate2) {    
    const recentData = getRecentDataOnDate(currentEndDate2);
    svg.selectAll("path").remove();
    svg.append("g")
        .selectAll("path")
        .data(topo.features)
        .enter()
        .append("path")
            // Draw each country
            .attr("d", d3.geoPath()
                .projection(projection)
            )
            // Set the color of each country
            .attr("fill", function (d) {
                const value = recentData[d.properties.name] || { cases: 0, deaths: 0 };
                return colorScales[currentMetric](value[currentMetric]);
            })
            .attr("class", "country")
            .on("mouseover", function(event, d) {
                d3.select(this).classed("hovered", true);
                const value = recentData[d.properties.name] || { cases: 0, deaths: 0 };
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`<strong>${d.properties.name}</strong><br>Cases: ${value.cases.toFixed(2)}<br>Deaths: ${value.deaths.toFixed(2)}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                d3.select(this).classed("hovered", false);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
}

// Function to draw the multi-line chart
function drawLineChart(currentEndDate2) {
    const dimensions = getLineChartDimensions();
    const margin = {top: 20, right: 30, bottom: 30, left: 40},
        width = dimensions.width - margin.left - margin.right,
        height = dimensions.height - margin.top - margin.bottom;

    const svg = d3.select("#lineChart")
        .attr("width", dimensions.width)
        .attr("height", dimensions.height);

    // Remove any existing lines
    svg.selectAll("*").remove();

    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Parse the date / time
    const parseTime = d3.timeParse("%Y-%m-%d");

    // Set the ranges
    const x = d3.scaleTime().range([0, width]);
    const y = d3.scaleLinear().range([height, 0]);

    // Define the line
    const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d.value));

    // Filter the data
    const filteredData = filterDataUpToDate(currentEndDate2);
   
    // Map the data
    const data = filteredData.map(d => ({
            date: parseTime(d.Date_reported.split('/').reverse().join('-')),
            value: currentMetric === 'cases' ? +d.Cumulative_cases_per_100k : +d.Cumulative_deaths_per_100k,
            country: d.Country
    }));

    // Group the entries by country
    const dataGroup = d3.group(data, d => d.country);

    // Scale the range of the data
    x.domain(d3.extent(data, d => d.date));
    y.domain([0, d3.max(data, d => d.value)]);

    // Add the X Axis
    g.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    // Add the Y Axis
    g.append("g")
        .call(d3.axisLeft(y));

    // Define a color scale
    const color = d3.scaleOrdinal(d3.schemeCategory10);

    // Add the lines
    dataGroup.forEach((values, key) => {
        g.append("path")
            .data([values])
            .attr("class", "line")
            .attr("d", line)
            .attr("stroke", color(key)) // Assign a different color to each line
            .on("mouseover", function(event, d) {
                d3.select(this).classed("hovered", true);
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html(`<strong>${key}</strong>`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", function(d) {
                d3.select(this).classed("hovered", false);
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);
            });
    });

    // Toggle button event listener for the line chart
    d3.select("#lineChartToggleButton").on("click", function() {
        currentMetric = currentMetric === 'cases' ? 'deaths' : 'cases';
        d3.select("#lineChartTitle").text(currentMetric === 'cases' ? 'Cases per 100,000 inhabitants' : 'Deaths per 100,000 inhabitants');
        d3.select("#lineChartToggleButton").text(`Toggle to ${currentMetric === 'cases' ? 'deaths' : 'cases'}`);
        setLanguage(currentLanguage);
        drawLineChart(currentEndDate2);
    }); 
}

const englishButton = document.getElementById('englishButton');
const spanishButton = document.getElementById('spanishButton');

const title = document.getElementById('title');
const toggleButton = document.getElementById('toggleButton');
const lineChartTitle = document.getElementById('lineChartTitle');
const lineChartToggleButton = document.getElementById('lineChartToggleButton');
const titlePage = document.getElementById('titlePage');

const texts = {
    english: {
        title: {
            cases: "Cases per 100,000 inhabitants on {}",
            deaths: "Deaths per 100,000 inhabitants on {}"
        },
        toggleButton: {
            cases: "Toggle to deaths",
            deaths: "Toggle to cases"
        },
        lineChartTitle: {
            cases: "Cases per 100,000 inhabitants between 2020-01-05 and {}",
            deaths: "Deaths per 100,000 inhabitants between 2020-01-05 and {}"
        },
        lineChartToggleButton: {
            cases: "Toggle to deaths",
            deaths: "Toggle to cases"
        },
        titlePage: "VISUALIZATION OF COVID-19 INFORMATION",
        startDate: "Start Date 2020-01-05",
        endDate: "End Date {}",
        playButton: "▶️ Play",
        stopButton: "⏹ Stop",
        resetButton: "🔄 Reset"
    },
    spanish: {
        title: {
            cases: "Casos por 100,000 habitantes al {}",
            deaths: "Fallecidos por 100,000 habitantes al {}"
        },
        toggleButton: {
            cases: "Cambiar a fallecidos",
            deaths: "Cambiar a casos"
        },
        lineChartTitle: {
            cases: "Casos por 100,000 habitantes entre 05/01/2020 - {}",
            deaths: "Fallecidos por 100,000 habitantes entre 05/01/2020 - {}"
        },
        lineChartToggleButton: {
            cases: "Cambiar a fallecidos",
            deaths: "Cambiar a casos"
        },
        titlePage: "VISUALIZACIÓN DE LA INFORMACIÓN DEL COVID-19",
        startDate: "Fecha Inicio 05/01/2020",
        endDate: "Fecha Fin {}",
        playButton: "▶️ Iniciar",
        stopButton: "⏹ Parar",
        resetButton: "🔄 Reiniciar"
    }
};


function setLanguage(language) {
    const langText = texts[currentLanguage];            
    d3.select("#title").text(langText.title[currentMetric]);
    d3.select("#toggleButton").text(langText.toggleButton[currentMetric]);
    d3.select("#lineChartTitle").text(langText.lineChartTitle[currentMetric]);
    d3.select("#lineChartToggleButton").text(langText.lineChartToggleButton[currentMetric]);
    d3.select("#titlePage").text(langText.titlePage);
    d3.select("#startDate").text(langText.startDate);
    d3.select("#endDate").text(langText.endDate);
    d3.select("#playButton").text(langText.playButton);
    d3.select("#stopButton").text(langText.stopButton);
    d3.select("#resetButton").text(langText.resetButton);

    if (language === 'english') {      
        englishButton.classList.add('active');
        englishButton.classList.remove('inactive');
        spanishButton.classList.add('inactive');
        spanishButton.classList.remove('active');
        currentLanguage = 'english';

    } else if (language === 'spanish') {
        spanishButton.classList.add('active');
        spanishButton.classList.remove('inactive');
        englishButton.classList.add('inactive');
        englishButton.classList.remove('active');
        currentLanguage = 'spanish';
    }
    updateTitle(currentEndDate);
}

function formatDate(dateString, language) {
    const dateParts = dateString.split("/");
    if (language === 'english') {
        return `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
    }
    return dateString;  
}

function updateTitle(weekIndex) {
    const langText = texts[currentLanguage]
    const endDate = dateRanges[weekIndex];
    const formattedEndDate = formatDate(endDate, currentLanguage);
    let titleText = langText.endDate.replace("{}", formattedEndDate);
    d3.select("#endDateDisplay").text(titleText);
    titleText = langText.title[currentMetric].replace("{}", formattedEndDate);
    d3.select("#title").text(titleText);
    titleText = langText.lineChartTitle[currentMetric].replace("{}", formattedEndDate);
    d3.select("#lineChartTitle").text(titleText);
    d3.select("#startDateDisplay").text(langText.startDate);
}


englishButton.addEventListener('click', () => setLanguage('english'));
spanishButton.addEventListener('click', () => setLanguage('spanish'));
setLanguage('english');
updateTitle(dateRanges.length-1);

document.getElementById('englishButton').addEventListener('click', () => setLanguage('english'));
document.getElementById('spanishButton').addEventListener('click', () => setLanguage('spanish'));
    
document.getElementById('languageButton').addEventListener('click', function() {
    const dropdown = document.getElementById('languageDropdown');
    dropdown.style.display = (dropdown.style.display === 'none') ? 'block' : 'none';
});
    
document.addEventListener('click', function(event) {
    const dropdown = document.getElementById('languageDropdown');
    const button = document.getElementById('languageButton');
    if (!button.contains(event.target)) {
        dropdown.style.display = 'none';
    }
});

function updateDateDisplays(sliderValue, selectedDate) {
    const startDate = dateRanges[0];
    const endDate = dateRanges[sliderValue];
    const langText = texts[currentLanguage];
    const startDateFormatted = formatDate(startDate, currentLanguage);
    const endDateFormatted = formatDate(endDate, currentLanguage);
    let titleText = langText.title[currentMetric].replace("{}", endDateFormatted);
    d3.select("#title").text(titleText);
    titleText = langText.lineChartTitle[currentMetric].replace("{}", endDateFormatted);
    d3.select("#lineChartTitle").text(titleText);

    document.getElementById('startDateDisplay').textContent = currentLanguage === 'spanish'
        ? `Fecha Inicio ${startDateFormatted}`
        : `Start Date ${startDateFormatted}`;

    document.getElementById('endDateDisplay').textContent = currentLanguage === 'spanish'
        ? `Fecha Fin ${endDateFormatted}`
        : `End Date ${endDateFormatted}`;
    
        if (intervalId != null){
            drawMap(selectedDate);
            drawLineChart(selectedDate);
        }
}

const dateRangeSlider = document.getElementById('dateRangeSlider');
dateRangeSlider.max = dateRanges.length - 1;
dateRangeSlider.value = dateRanges.length - 1;

dateRangeSlider.addEventListener('input', function() {
    const selectedDateIndex = dateRangeSlider.value;
    const selectedDate = dateRanges[selectedDateIndex];
    updateDateDisplays(selectedDateIndex, selectedDate);
    if (intervalId == null){
        drawMap(selectedDate);
        drawLineChart(selectedDate);
    }
});

updateDateDisplays(dateRanges.length - 1, dateRanges[dateRanges.length - 1]);

document.getElementById('playButton').addEventListener('click', function() {
    if (intervalId) return; // Prevent multiple intervals running
    if (intervalId == null) dateRangeSlider.value = 0;
    intervalId = setInterval(function() {
        let currentValue = parseInt(dateRangeSlider.value);
        if (currentValue < dateRanges.length - 1) {
            dateRangeSlider.value = currentValue + 2; // Step 2
            updateDateDisplays(dateRangeSlider.value, dateRanges[dateRangeSlider.value]);
        } else {
            clearInterval(intervalId); // Stop if reached the end
        }
    }, 1000); // Adjust speed as needed
});

// Stop button functionality
document.getElementById('stopButton').addEventListener('click', function() {
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
});

// Reset button functionality: set slider to the end date
document.getElementById('resetButton').addEventListener('click', function() {
    clearInterval(intervalId);
    intervalId = null;
    dateRangeSlider.value = dateRanges.length - 1;
    drawMap(dateRanges[dateRangeSlider.value]);
    drawLineChart(dateRanges[dateRangeSlider.value]);
});