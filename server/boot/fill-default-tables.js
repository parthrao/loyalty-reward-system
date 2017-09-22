module.exports = function(app) {

  var ds = app.datasources.mongoDs;

  // Generate default categories
  generateCategories();

  // Generate default cities
  generateCities();

  // Generate Reward Types
  generateRewardTypes();

  function generateCategories () {
    // check whther categories already exists or not
    app.models.Category.find({where:{}}, function(err, categories) {
      if(err || !categories) {
        createCategories();
      }
      else if (categories.length == 0)
        createCategories();
      else {
        console.log('categories already created');
      }
    });
    // createCategories();

    function createCategories () {
      ds.automigrate('Category', function(err) {
        if (err) throw err;
          // ds.disconnect();
        var categories = [
          {
            name: "Food"
          },
          {
            name: "Dine"
          },
          {
            name: "Grocery"
          },
          {
            name: "Coffee Shop"
          },
          {
            name: "Petrol Pump"
          },
          {
            name: "Clothes"
          },
          {
            name: "Jwellery"
          }
        ];
        var count = categories.length;
        categories.forEach(function(category) {
          app.models.Category.create(category, function(err, model) {
            if (err) throw err;

            console.log('Created:', model);

            count--;
            if (count === 0)
              return
          });
        });
      });
    }
  }

  function generateCities () {
    app.models.City.find({where:{}}, function(err, cities) {
      if(err || !cities) {
        createCities();
      }
      else if (cities.length == 0)
        createCities();
      else {
        console.log('cities already created');
      }
    });
    // createCategories();

    function createCities () {
      ds.automigrate('City', function(err) {
        if (err) throw err;
          // ds.disconnect();
        var cities = [
          {
            name: "Ahmedabad"
          },
          {
            name: "Mumbai"
          },
          {
            name: "Delhi"
          },
          {
            name: "Gandhinagar"
          },
          {
            name: "Bangalore"
          },
          {
            name: "Pune"
          },
          {
            name: "Baroda"
          }
        ];
        var count = cities.length;
        cities.forEach(function(city) {
          app.models.City.create(city, function(err, model) {
            if (err) throw err;

            console.log('Created:', model);

            count--;
            if (count === 0)
              return
          });
        });
      });
    }
  }

  function generateRewardTypes () {
    app.models.Reward_Type.find({where:{}}, function(err, rewardTypes) {
      if(err || !rewardTypes) {
        createRewardTypes();
      }
      else if (rewardTypes.length == 0)
        createRewardTypes();
      else {
        console.log('rewardTypes already created');
      }
    });
    // createCategories();

    function createRewardTypes () {
      ds.automigrate('Reward_Type', function(err) {
        if (err) throw err;
          // ds.disconnect();
        var rewardTypes = [
          {
            type: "DOS"
          },
          {
            type: "POS"
          },
          {
            type: "HAPPY_HOURS"
          },
          {
            type: "REFERRAL"
          },
          {
            type: "BIRTHDAY"
          },
          {
            type: "JOINING"
          },
          {
            type: "CHECK_IN"
          }
        ];
        var count = rewardTypes.length;
        rewardTypes.forEach(function(rewardType) {
          app.models.Reward_Type.create(rewardType, function(err, model) {
            if (err) throw err;

            console.log('Created:', model);

            count--;
            if (count === 0)
              return
          });
        });
      });
    }
  }





}
