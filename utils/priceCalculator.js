function calculateFinalPrice(salePrice, productOffer = 0, categoryOffer = 0) {
  const bestOffer = Math.max(productOffer, categoryOffer);

  let finalPrice = salePrice;
  if (bestOffer > 0) {
    finalPrice = salePrice - Math.round((salePrice * bestOffer) / 100);
  }

  return {
    finalPrice,
    appliedOffer: bestOffer
  };
}

module.exports = { calculateFinalPrice };
