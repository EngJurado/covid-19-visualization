# COVID-19 Visualization

This project is a visualization of COVID-19 data using HTML, CSS, and JavaScript. The data is obtained from CSV files and processed to display interactive charts.

## Authors

- Carlos Mateo Jurado Díaz
- Alejandro Cobo Constain
- Rodrigo Ortega Bocanegra

## Project Structure


```
covid-19-visualization/
├── data.js
├── dataframe.ipynb 
├── df.json
├── index.html 
├── script.js 
├── styles.css
├── covid-19.png
├── tierra.png
└── Dataset/
    ├── population_by_country_2020.csv 
    └── WHO-COVID-19-global-data.csv
```

## Main Files

- **index.html**: The main file of the web page.
- **styles.css**: CSS styles file.
- **script.js**: JavaScript file that handles the page logic.
- **data.js**: JavaScript file that handles data loading.
- **dataframe.ipynb**: Jupyter Notebook for data processing.
- **df.json**: JSON file with processed data.
- **Dataset/**: Folder containing the original CSV files.

## Datasets

The datasets used in this project can be found at the following Kaggle links:

- [Daily COVID-19 Data (2020-2024)](https://www.kaggle.com/datasets/abdoomoh/daily-covid-19-data-2020-2024/data)
- [Population by Country (2020)](https://www.kaggle.com/datasets/tanuprabhu/population-by-country-2020)

## Installation

1. Clone the repository:
    ```sh
    git clone https://github.com/EngJurado/covid-19-visualization.git
    ```
2. Navigate to the project directory:
    ```sh
    cd covid-19-visualization
    ```

## Data Preprocessing

1. Download the datasets from Kaggle and place them in the `Dataset/` folder.
2. Open and run the `dataframe.ipynb` notebook to process the data and convert it to JSON format to be read by JavaScript.

## Usage

1. Open `index.html` in your browser to view the visualization.
2. You can modify the CSV files in the `Dataset/` folder and reprocess them using `dataframe.ipynb`.

## Contributions

Contributions are welcome. Please open an issue or a pull request to discuss any changes.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
