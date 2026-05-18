export interface Plan {
  id: string;
  name: string;
  price: number;
  category: "budget" | "performance";
  hardware: string;
  features: string[];
  specs: {
    cpu: string;
    ram: string;
    disk: string;
    backups: number;
    ports: number;
    databases?: number;
    nestId: number;
    eggId: number;
    locationId: number;
    nodeId?: number;
  };
  recommended?: boolean;
  paymentLink?: string;
}

export const plans: Plan[] = [
  // PERFORMANCE PLANS (RYZEN 7 7700X)
  {
    id: "perf-iron",
    name: "Premium Iron",
    price: 420,
    category: "performance",
    hardware: "Ryzen 7 7700X @ 4.491GHz",
    features: ["High Frequency Gaming CPU", "DDR4 ECC Memory", "NVMe SSD"],
    specs: { cpu: "200%", ram: "8GB", disk: "20GB", backups: 1, ports: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-gold",
    name: "Premium Gold",
    price: 680,
    category: "performance",
    hardware: "Ryzen 7 7700X @ 4.491GHz",
    features: ["High Frequency Gaming CPU", "DDR4 ECC Memory", "NVMe SSD"],
    specs: { cpu: "400%", ram: "16GB", disk: "50GB", backups: 1, ports: 5, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-emerald",
    name: "Premium Emerald",
    price: 790,
    category: "performance",
    hardware: "Ryzen 7 7700X @ 4.491GHz",
    features: ["High Frequency Gaming CPU", "DDR4 ECC Memory", "NVMe SSD"],
    specs: { cpu: "450%", ram: "24GB", disk: "60GB", backups: 2, ports: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 },
    recommended: true
  },
  {
    id: "perf-obsidian",
    name: "Premium Obsidian",
    price: 999,
    category: "performance",
    hardware: "Ryzen 7 7700X @ 4.491GHz",
    features: ["High Frequency Gaming CPU", "DDR4 ECC Memory", "NVMe SSD"],
    specs: { cpu: "500%", ram: "32GB", disk: "80GB", backups: 3, ports: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-netherite",
    name: "Premium Netherite",
    price: 1099,
    category: "performance",
    hardware: "Ryzen 7 7700X @ 4.491GHz",
    features: ["High Frequency Gaming CPU", "DDR4 ECC Memory", "NVMe SSD"],
    specs: { cpu: "600%", ram: "48GB", disk: "100GB", backups: 4, ports: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },
  {
    id: "perf-gladiator",
    name: "Premium Gladiator",
    price: 1290,
    category: "performance",
    hardware: "Ryzen 7 7700X @ 4.491GHz",
    features: ["High Frequency Gaming CPU", "DDR4 ECC Memory", "NVMe SSD"],
    specs: { cpu: "800%", ram: "64GB", disk: "150GB", backups: 5, ports: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 1 }
  },

  // BUDGET PLANS (INTEL)
  {
    id: "budget-classic",
    name: "Classic Plan",
    price: 50,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Basic Support", "SSD Storage"],
    specs: { cpu: "120%", ram: "6GB", disk: "20GB", backups: 1, ports: 0, databases: 1, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/0gS0Hmvr"
  },
  {
    id: "budget-epic",
    name: "Epic Plan",
    price: 100,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Basic Support", "SSD Storage"],
    specs: { cpu: "180%", ram: "10GB", disk: "40GB", backups: 3, ports: 1, databases: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    recommended: true,
    paymentLink: "https://rzp.io/rzp/v1HXLLs1"
  },
  {
    id: "budget-pro",
    name: "Pro Plan",
    price: 250,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Standard Support", "SSD Storage"],
    specs: { cpu: "250%", ram: "16GB", disk: "60GB", backups: 4, ports: 2, databases: 2, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/ox9kJuqm"
  },
  {
    id: "budget-power",
    name: "Power Plan",
    price: 450,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "24/7 Support", "SSD Storage"],
    specs: { cpu: "300%", ram: "24GB", disk: "80GB", backups: 5, ports: 3, databases: 3, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/qP6wEcNv"
  },
  {
    id: "budget-mega",
    name: "Mega Plan",
    price: 620,
    category: "budget",
    hardware: "Intel Xeon Node",
    features: ["Affordable Node", "Priority Support", "SSD Storage"],
    specs: { cpu: "400%", ram: "32GB", disk: "150GB", backups: 7, ports: 5, databases: 5, nestId: 1, eggId: 4, locationId: 1, nodeId: 9 },
    paymentLink: "https://rzp.io/rzp/bR6SsWm"
  }
];
