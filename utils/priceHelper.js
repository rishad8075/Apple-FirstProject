exports.calculateFinalPrice = ({
  salePrice,
  productOffer = 0,
  categoryOffer = 0
}) => {
  const bestOffer = Math.max(productOffer, categoryOffer);
  const discount = Math.round((salePrice * bestOffer) / 100);

  return {
    finalPrice: salePrice - discount,
    discount,
    appliedOffer: bestOffer
  };
};
