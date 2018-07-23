
/**
 * GET /about
 * About page.
 */
exports.getAbout = (req, res) => {
  res.render('about', {
    title: 'Acerca De',
  });
};
