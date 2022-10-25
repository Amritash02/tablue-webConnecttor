/* global tableau */

const apikey = "ftBC1Sa60i7_ytsLphJyFCTTsU2iwhRWkys8_5fpl6A";
let timeout, title, lat, lng;

let myConnector = tableau.makeConnector();

myConnector.getSchema = schemaCallback => {
  let dailyCols = [
    {
      id: "date",
      alias: "Date",
      dataType: "date"
    },
    {
      id: "description",
      alias: "Description",
      dataType: "string"
    },
    {
      id: "lowTemperature",
      alias: "Low Temperature",
      dataType: "float"
    },
    {
      id: "highTemperature",
      alias: "High Temperature",
      dataType: "float"
    },
    {
      id: "rainFall",
      alias: "Rain Fall",
      dataType: "float"
    },
    {
      id: "snowFall",
      alias: "SnowFall",
      dataType: "float"
    },
    {
      id: "humidity",
      alias: "Humidity",
      dataType: "int"      
    },
    {
      id: "windSpeed",
      alias: "Wind Speed",
      dataType: "float"      
    },
    {
      id: "windDirection",
      alias: "Wind Direction",
      dataType: "string"      
    },
    {
      id: "uvIndex",
      alias: "UV Index",
      dataType: "int"      
    },
    {
      id: "uvDescription",
      alias: "UV Description",
      dataType: "string"      
    }
  ];

  let dailySchema = {
    id: "dailyForecast",
    alias: "Daily Forecast",
    columns: dailyCols
  };

  let hourlyCols = [
    {
      id: "date",
      alias: "Date",
      dataType: "date"
    },    
    {
      id: "datetime",
      alias: "Date & Time",
      dataType: "datetime"
    },
    {
      id: "description",
      alias: "Description",
      dataType: "string"
    },    
    {
      id: "temperature",
      alias: "Temperature",
      dataType: "float"
    },
    {
      id: "rainFall",
      alias: "Rain Fall",
      dataType: "float"
    },
    {
      id: "snowFall",
      alias: "SnowFall",
      dataType: "float"
    },
    {
      id: "humidity",
      alias: "Humidity",
      dataType: "int"      
    },
    {
      id: "windSpeed",
      alias: "Wind Speed",
      dataType: "float"      
    },
    {
      id: "windDirection",
      alias: "Wind Direction",
      dataType: "string"      
    }
  ];

  let hourlySchema = {
    id: "hourlyForecast",
    alias: "Hourly Forecast",
    columns: hourlyCols
  };
  
  schemaCallback([dailySchema, hourlySchema]);
};

myConnector.getData = (table, doneCallback) => {
  let connectionData = JSON.parse(tableau.connectionData);
  let lat = connectionData.lat;
  let lng = connectionData.lng;
  let units = connectionData.units;
  let tableData = [];

  if (table.tableInfo.id === "dailyForecast") {
    let url = `https://weather.ls.hereapi.com/weather/1.0/report.json?apiKey=${apikey}&product=forecast_7days_simple&latitude=${lat}&longitude=${lng}&metric=${!units}`;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        let forecasts = data.dailyForecasts.forecastLocation.forecast;
        for (let day of forecasts) {
          tableData.push({
            date: day.utcTime.substring(0, 10),
            description: day.description,
            lowTemperature: day.lowTemperature,
            highTemperature: day.highTemperature,
            rainFall: day.rainFall,
            snowFall: day.snowFall,
            humidity: day.humidity,
            windSpeed: day.windSpeed,
            windDirection: day.windDesc,
            uvIndex: day.uvIndex,
            uvDescription: day.uvDesc,
          });
        }
        table.appendRows(tableData);
        doneCallback();
      });
  }

  if (table.tableInfo.id === "hourlyForecast") {
    let url = `https://weather.ls.hereapi.com/weather/1.0/report.json?apiKey=${apikey}&product=forecast_hourly&latitude=${lat}&longitude=${lng}&metric=${!units}`;
    fetch(url)
      .then(response => response.json())
      .then(data => {
        console.log(data);
        let forecasts = data.hourlyForecasts.forecastLocation.forecast;
        for (let day of forecasts) {
          let date = new Date(day.utcTime);
          tableData.push({
            date: day.utcTime.substring(0, 10),
            datetime: `${day.utcTime.substring(0, 10)} ${day.localTime.substring(
              0,
              2
            )}:00`,
            description: day.description,
            temperature: day.temperature,
            rainFall: day.rainFall,
            snowFall: day.snowFall,
            humidity: day.humidity,
            windSpeed: day.windSpeed,
            windDirection: day.windDesc,            
          });
        }
        table.appendRows(tableData);
        doneCallback();
      });
  }
};

tableau.registerConnector(myConnector);
window._tableau.triggerInitialization &&
  window._tableau.triggerInitialization(); // Make sure WDC is initialized properly

// Search for the best city match from user input
function searchCity() {
  let query = $("#query").val();
  if (query === "") return error("Please enter a city.");
  let url = `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURI(
    query
  )}&apiKey=${apikey}`;

  fetch(url)
    .then(response => response.json())
    .then(data => {
      if (data.error) {
        error(data.error);
        return;
      }

      if (data.items.length === 0) {
        error("No city found, please try again.");
        return;
      }

      let city = data.items[0];
      title = city.title;
      lat = city.position.lat;
      lng = city.position.lng;
      $("#error").html("");
      $("#city").html(title);
      updateMap({ lat, lng });
      $("#submit").prop("disabled", false);
    });
}

function updateMap({ lat, lng}) {
  let url = `https://image.maps.ls.hereapi.com/mia/1.6/mapview?apiKey=${apikey}&lat=${lat}&lon=${lng}&vt=0&z=12`;

  fetch(url)
    .then(response => response.blob())
    .then(blob => {
      let reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = function() {
        let base64data = reader.result;
        $("#map").attr("src", base64data);
      };
    });
}

function submit() {
  let units = $("#units").prop("checked");
  tableau.connectionData = JSON.stringify({ lat, lng, units });
  tableau.connectionName = title + " Forecast";
  tableau.submit();
}

function error(message) {
  $("#city").html("---");
  $("#error").html(message);
  $("#map").html(
    `<img src="https://cdn.glitch.com/ff5fdd88-d432-43e5-8da1-c0481b1f4b15%2FMap_Placeholder.png?v=1595460045222" />`
  );
  $("#submit").prop("disabled", true);
}

// Run search function 2 seconds after last input
$("#query").on("input", () => {
  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(searchCity, 2000);
});

// Run search if user presses enter
$(document).on("keypress", function(e) {
  if (e.which == 13) {
    if (timeout) {
      clearTimeout(timeout);
    }
    searchCity();
  }
});
