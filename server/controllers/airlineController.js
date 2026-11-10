const { Airline } = require('../models');

exports.getAirlineStatuses = async (req, res) => {
  try {
    const airlines = await Airline.findAll({
      attributes: ['iataCode', 'name', 'isInService'],
      raw: true
    });

    const formatted = airlines.map(a => ({
      iataCode: a.iataCode,
      airlineCode: a.iataCode,
      name: a.name,
      airlineService: a.name,
      isInService: !!a.isInService,
      status: !!a.isInService
    }));

    return res.status(200).json(formatted);
  } catch (error) {
    return res.status(500).json({ error: 'Unable to retrieve fleet carrier operational statuses at this time.' });
  }
};
