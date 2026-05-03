const softDeleteHelper = async (prisma, model, id) => {
  return prisma[model].update({
    where: { id },
    data: { isDeleted: true }
  });
};

const hardDeleteHelper = async (prisma, model, id) => {
  return prisma[model].delete({
    where: { id }
  });
};

const findActiveOnly = (query) => {
  return {
    ...query,
    where: {
      ...query.where,
      isDeleted: false
    }
  };
};

module.exports = {
  softDeleteHelper,
  hardDeleteHelper,
  findActiveOnly
};
