const { Airline } = require('../models');

exports.getAirlineStatuses = async (req, res) => {
  try {
    const airlines = await Airline.findAll({
      attributes: [
        ['iataCode', 'airlineCode'],
        ['name', 'airlineService'],
        ['isInService', 'status']
      ],
      raw: true
    });

    return res.status(200).json(airlines);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to retrieve fleet carrier operational statuses at this time.' });
  }
};
