import { Request, Response } from 'express';
import { prisma } from '../../../../config/database';

// [GET] /api/v1/client/villas
export const index = async (req: Request, res: Response) => {
  try {
    const villas = await prisma.villas.findMany({
      where: {
        status: 'active',
      },
      orderBy: {
        created_at: 'desc', 
      },
    });

    res.json({
      success: true,
      data: villas,
    });
  } catch (error) {
    console.error('Error fetching villas:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching villas',
    });
  }
};

// [GET] /api/v1/client/villas/detail/:id
export const getVillaDetail = async (req: Request, res: Response): Promise<void> => {
  try {
    const id = String(req.params.id);

    const villa = await prisma.villas.findFirst({
      where: {
        id: id,
        status: 'active',
      },
    });

    if (!villa) {
      res.status(404).json({
        success: false,
        message: 'Villa not found!',
      });
      return;
    }

    res.json({
      success: true,
      data: villa,
    });
  } catch (error) {
    console.error('Error fetching villa details:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching villa details',
    });
  }
};

// [GET] /api/v1/client/villas/search
export const searchVillas = async (req: Request, res: Response): Promise<void> => {
  try {
    const q = req.query.q ? String(req.query.q) : '';

    if (!q) {
      res.json({ success: true, data: [] });
      return;
    }

    // 1. Find tenants (owners) whose names match the keyword
    const matchingTenants = await prisma.tenants.findMany({
      where: {
        name: { contains: q, mode: 'insensitive' },
      },
      select: { id: true },
    });
    
    const tenantIds = matchingTenants.map((t) => t.id);

    // 2. Find active villas that match the keyword in their name or address, 
    //    OR belong to the tenants found above
    const villas = await prisma.villas.findMany({
      where: {
        status: 'active',
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { address: { contains: q, mode: 'insensitive' } },
          { tenant_id: { in: tenantIds } },
        ],
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    res.json({
      success: true,
      data: villas,
    });
  } catch (error) {
    console.error('Error searching villas:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching villas',
    });
  }
};
