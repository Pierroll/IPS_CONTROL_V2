import { User, CreateUserPayload } from "@/types/user";
import { Customer, CreateCustomerPayload } from "@/types/customer";
import { Plan, CreatePlanPayload } from "@/types/plans";
import { CustomerPlan, CreateCustomerPlanPayload } from "@/types/customerPlan";
import { Technician, CreateTechnicianPayload } from "@/types/technician";
import { BillingAccount, CreateInvoicePayload, Invoice, InvoiceItem, RecordPaymentPayload, Payment } from "@/types/billing";
import { Ticket, CreateTicketPayload } from "@/types/ticket";
import { MessageLog, SendManualReminderPayload } from "@/types/notification";
import { AdvancePayment, AdvanceMonthlyPayment, CreateAdvancePaymentPayload } from "@/types/advancePayment";

interface ApiError extends Error {
  status?: number;
}

const handleResponse = async (response: Response, originalRequest?: () => Promise<Response>) => {
  console.log(`🔍 handleResponse - Status: ${response.status}, URL: ${response.url}`);
  
  if (!response.ok) {
    // Si es error 401 o 403 (token inválido/expirado), intentar refrescar
    if ((response.status === 401 || response.status === 403) && originalRequest) {
      try {
        console.log("🔄 Token inválido/expirado, intentando refresh...");
        const newToken = await refreshToken();
        console.log("✅ Token refrescado, reintentando petición...");
        const newResponse = await originalRequest();
        return await handleResponse(newResponse); // Procesar la nueva respuesta
      } catch (refreshError) {
        console.error("❌ Error al refrescar token:", refreshError);
        // Si el refresh falla, limpiar tokens y redirigir al login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");
        if (typeof window !== 'undefined') {
          window.location.href = "/auth";
        }
        throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
      }
    }
    
    // Leer el cuerpo de la respuesta una sola vez
    let errorData = {};
    let errorText = '';
    try {
      errorText = await response.text();
      if (errorText) {
        try {
          errorData = JSON.parse(errorText);
        } catch (parseError) {
          // Si no es JSON válido, usar el texto como mensaje
          errorData = { error: errorText || `Error ${response.status}` };
        }
      }
    } catch (e) {
      // Si no se puede leer el texto, usar mensaje genérico
      errorData = { error: `Error ${response.status}` };
    }
    
    // Si es 401 o 403 sin función de reintento, intentar refrescar token
    if ((response.status === 401 || response.status === 403) && !originalRequest) {
      const errorMsg = errorData.error || errorData.message || '';
      // Si el error es de token inválido, intentar refrescar una vez
      if (errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('inválido') || errorMsg.toLowerCase().includes('denegado')) {
        try {
          console.log("🔄 Intentando refrescar token automáticamente...");
          await refreshToken();
          // Si el refresh funciona, lanzar error para que el componente maneje el reintento
          throw new Error("Token actualizado. Por favor, recarga la página o intenta nuevamente.");
        } catch (refreshError: any) {
          // Si falla el refresh, limpiar y redirigir
          console.error("❌ No se pudo refrescar el token:", refreshError);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_data");
          if (typeof window !== 'undefined') {
            window.location.href = "/auth";
          }
          throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        }
      }
    }
    
    console.error(`❌ Error en ${response.url}:`, errorData, response.status);
    
    // Construir mensaje de error más descriptivo
    let errorMessage = errorData.error || errorData.message;
    
    if (!errorMessage) {
      // Si no hay mensaje, crear uno basado en el código de estado
      switch (response.status) {
        case 400:
          errorMessage = 'Solicitud inválida. Verifica los datos enviados.';
          break;
        case 401:
          errorMessage = 'No autorizado. Por favor, inicia sesión nuevamente.';
          break;
        case 403:
          errorMessage = 'Acceso denegado. No tienes permisos para esta acción.';
          break;
        case 404:
          errorMessage = 'Recurso no encontrado.';
          break;
        case 500:
          errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
          break;
        default:
          errorMessage = `Error ${response.status}: ${response.statusText || 'Error desconocido'}`;
      }
    }
    
    const error = new Error(errorMessage) as ApiError;
    error.status = response.status;
    throw error;
  }
  
  const data = await response.json();
  console.log(`✅ handleResponse - Success data:`, data);
  return data;
};

const getToken = () => {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new Error("No se encontró el token de autenticación");
  }
  return token;
};

const refreshToken = async () => {
  const refreshTokenValue = localStorage.getItem("refresh_token");
  if (!refreshTokenValue) {
    throw new Error("No se encontró el refresh token");
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshTokenValue }),
  });

  if (!response.ok) {
    // Si el refresh falla, redirigir al login
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_data");
    window.location.href = "/auth";
    throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
  }

  const data = await response.json();
  localStorage.setItem("access_token", data.accessToken);
  return data.accessToken;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

// Log para depuración (solo en desarrollo)
if (typeof window !== 'undefined') {
  console.log("🌐 API_URL configurada:", API_URL);
  console.log("🌐 NEXT_PUBLIC_API_URL desde env:", process.env.NEXT_PUBLIC_API_URL);
}

const apiFacade = {
  async login(email: string, password: string) {
    try {
      console.log("🔗 Intentando conectar a:", `${API_URL}/auth/login`);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await handleResponse(response);
      localStorage.setItem("access_token", data.accessToken);
      localStorage.setItem("refresh_token", data.refreshToken);
      localStorage.setItem("user_data", JSON.stringify(data.user));
      return data;
    } catch (error: any) {
      console.error("❌ Error en login:", error);
      if (error.message === "Failed to fetch" || error.name === "TypeError") {
        throw new Error(`No se pudo conectar al servidor. Verifica que el backend esté corriendo en ${API_URL}`);
      }
      throw error;
    }
  },

  async getUsers(role?: string): Promise<User[]> {
    const token = getToken();
    const url = role ? `${API_URL}/users?role=${role}` : `${API_URL}/users`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getUserById(id: string): Promise<User> {
    const token = getToken();
    const response = await fetch(`${API_URL}/users/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async createUser(data: CreateUserPayload): Promise<{ message: string; user: User }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updateUser(id: string, data: Partial<User>): Promise<{ message: string; user: User }> {
    const token = getToken();
    try {
      const response = await fetch(`${API_URL}/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(data),
      });
      return handleResponse(response);
    } catch (error) {
      return apiFacade.handleApiError(error as ApiError, (newToken) =>
        fetch(`${API_URL}/users/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${newToken}` },
          body: JSON.stringify(data),
        }).then(handleResponse)
      );
    }
  },

  async deleteUser(id: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/users/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async refreshToken(): Promise<{ accessToken: string }> {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }
    const response = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await handleResponse(response);
    localStorage.setItem("access_token", data.accessToken);
    return data;
  },

  async handleApiError(error: ApiError, retryFn?: (token: string) => Promise<any>): Promise<any> {
    if (error.status === 401) {
      try {
        const newTokenData = await apiFacade.refreshToken();
        localStorage.setItem("access_token", newTokenData.accessToken);
        if (retryFn) {
          return retryFn(newTokenData.accessToken);
        }
      } catch (refreshError) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");
        window.location.href = "/auth";
      }
    }
    throw error;
  },

  async getCustomers(): Promise<Customer[]> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customers`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return data.map((customer: any) => ({
      ...customer,
      createdAt: new Date(customer.createdAt),
      contractDate: customer.contractDate ? new Date(customer.contractDate) : null,
      customerPlans: (customer.customerPlans || []).map((cp: any) => ({
        ...cp,
        planId: cp.planId ?? cp.plan?.id ?? cp.plan_id ?? "",
        startDate: new Date(cp.startDate),
        endDate: cp.endDate ? new Date(cp.endDate) : undefined,
        createdAt: new Date(cp.createdAt),
        updatedAt: new Date(cp.updatedAt),
        plan: { name: cp.plan?.name ?? cp.planName ?? "" },
      })),
    }));
  },

  async getCustomersWithDetails(params?: { district?: string; technicianId?: string; page?: number; limit?: number }): Promise<{ data: Customer[]; totalPages?: number }> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.district) qs.set("district", params.district);
    if (params?.technicianId) qs.set("technicianId", params.technicianId);
    if (params?.page) qs.set("page", params.page.toString());
    if (params?.limit) qs.set("limit", params.limit.toString());
    const url = `${API_URL}/customers/with-details${qs.toString() ? `?${qs.toString()}` : ""}`;
    try {
      const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await handleResponse(response);
      // Asegurarse de que siempre se devuelva un arreglo en data
      const customers = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      return {
        data: customers.map((customer: any) => ({
          ...customer,
          createdAt: new Date(customer.createdAt),
          contractDate: customer.contractDate ? new Date(customer.contractDate) : null,
          customerPlans: (customer.customerPlans || []).map((cp: any) => ({
            ...cp,
            planId: cp.planId ?? cp.plan?.id ?? cp.plan_id ?? "",
            startDate: new Date(cp.startDate),
            endDate: cp.endDate ? new Date(cp.endDate) : undefined,
            createdAt: new Date(cp.createdAt),
            updatedAt: new Date(cp.updatedAt),
            plan: { name: cp.plan?.name ?? cp.planName ?? "", monthlyPrice: parseFloat(cp.plan?.monthlyPrice || 0) },
          })),
          billingAccount: customer.billingAccount
            ? {
                ...customer.billingAccount,
                balance: parseFloat(customer.billingAccount.balance || 0),
                status: customer.billingAccount.status,
                createdAt: new Date(customer.billingAccount.createdAt),
                updatedAt: new Date(customer.billingAccount.updatedAt),
                suspendedAt: customer.billingAccount.suspendedAt ? new Date(customer.billingAccount.suspendedAt) : null,
                lastPaymentDate: customer.billingAccount.lastPaymentDate ? new Date(customer.billingAccount.lastPaymentDate) : null,
              }
            : null,
          // Agregar los nuevos campos de estado de pago
          paymentStatus: customer.paymentStatus,
          statusMessage: customer.statusMessage,
          advancePaymentInfo: customer.advancePaymentInfo,
          paidUntilDate: customer.paidUntilDate ? new Date(customer.paidUntilDate) : null,
        })),
        totalPages: data?.totalPages || 1,
      };
    } catch (error) {
      console.error("Error en getCustomersWithDetails:", error);
      return { data: [], totalPages: 1 }; // Devolver arreglo vacío en caso de error
    }
  },

  async getCustomerById(id: string): Promise<Customer> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const customer = await handleResponse(response);
    return {
      ...customer,
      createdAt: new Date(customer.createdAt),
      contractDate: customer.contractDate ? new Date(customer.contractDate) : null,
      customerPlans: (customer.customerPlans || []).map((cp: any) => ({
        ...cp,
        planId: cp.planId ?? cp.plan?.id ?? cp.plan_id ?? "",
        startDate: new Date(cp.startDate),
        endDate: cp.endDate ? new Date(cp.endDate) : undefined,
        createdAt: new Date(cp.createdAt),
        updatedAt: new Date(cp.updatedAt),
        plan: { name: cp.plan?.name ?? cp.planName ?? "" },
      })),
    };
  },

  async createCustomer(data: CreateCustomerPayload): Promise<{ message: string; customer: Customer }> {
    const token = getToken();
    console.log('Enviando solicitud a /api/customers:', JSON.stringify(data, null, 2));
    try {
      const response = await fetch(`${API_URL}/customers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...data,
          contractDate: data.contractDate ? new Date(data.contractDate).toISOString() : null,
        }),
      });
      console.log('Respuesta de /api/customers:', {
        status: response.status,
        statusText: response.statusText,
      });
      const result = await handleResponse(response);
      console.log('Resultado de createCustomer:', JSON.stringify(result, null, 2));
      
      // Ajustar la respuesta para que coincida con la interfaz esperada
      const customer = {
        ...result,
        createdAt: new Date(result.createdAt),
        contractDate: result.contractDate ? new Date(result.contractDate) : null,
        customerPlans: (result.customerPlans || []).map((plan: any) => ({
          ...plan,
          startDate: new Date(plan.startDate),
          endDate: plan.endDate ? new Date(plan.endDate) : undefined,
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(plan.updatedAt),
          plan: { name: plan.plan?.name || '' },
        })),
      };
      
      return {
        message: 'Customer created successfully', // Agregar un mensaje por defecto
        customer,
      };
    } catch (err: any) {
      console.error('Error en createCustomer:', {
        message: err.message,
        status: err.status,
        response: err.response ? JSON.stringify(err.response, null, 2) : null,
      });
      throw err;
    }
  },

  async updateCustomer(id: string, data: Partial<Customer>): Promise<{ message: string; customer: Customer }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...data,
        contractDate: data.contractDate instanceof Date ? data.contractDate.toISOString() : data.contractDate,
      }),
    });
    const result = await handleResponse(response);
    return {
      ...result,
      customer: {
        ...result.customer,
        createdAt: new Date(result.customer.createdAt),
        contractDate: result.customer.contractDate ? new Date(result.customer.contractDate) : null,
        customerPlans: result.customer.customerPlans?.map((plan: any) => ({
          ...plan,
          startDate: new Date(plan.startDate),
          endDate: plan.endDate ? new Date(plan.endDate) : undefined,
          createdAt: new Date(plan.createdAt),
          updatedAt: new Date(plan.updatedAt),
          plan: { name: plan.plan.name },
        })) || [],
      },
    };
  },

  async deleteCustomer(id: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customers/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getPlans(): Promise<Plan[]> {
    const token = getToken();
    const response = await fetch(`${API_URL}/plans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return data.map((plan: any) => ({
      ...plan,
      monthlyPrice: typeof plan.monthlyPrice === "string" ? parseFloat(plan.monthlyPrice) : plan.monthlyPrice,
      downloadSpeed: typeof plan.downloadSpeed === "string" ? parseFloat(plan.downloadSpeed) : plan.downloadSpeed,
      uploadSpeed: typeof plan.uploadSpeed === "string" ? parseFloat(plan.uploadSpeed) : plan.uploadSpeed,
      setupFee: typeof plan.setupFee === "string" ? parseFloat(plan.setupFee) : plan.setupFee,
    }));
  },

  async getPlanById(id: string, token?: string): Promise<Plan> {
    const response = await fetch(`${API_URL}/plans/${id}`, {
      headers: { Authorization: `Bearer ${token || getToken()}` },
    });
    const data = await handleResponse(response);
    return {
      ...data,
      monthlyPrice: typeof data.monthlyPrice === "string" ? parseFloat(data.monthlyPrice) : data.monthlyPrice,
      downloadSpeed: typeof data.downloadSpeed === "string" ? parseFloat(data.downloadSpeed) : data.downloadSpeed,
      uploadSpeed: typeof data.uploadSpeed === "string" ? parseFloat(data.uploadSpeed) : data.uploadSpeed,
      setupFee: typeof data.setupFee === "string" ? parseFloat(data.setupFee) : data.setupFee,
    };
  },

  async createPlan(data: CreatePlanPayload): Promise<{ message: string; plan: Plan }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/plans`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async updatePlan(id: string, data: Partial<Plan>, token?: string): Promise<{ message: string; plan: Plan }> {
    const response = await fetch(`${API_URL}/plans/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || getToken()}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async deletePlan(id: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/plans/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getCustomerPlans(): Promise<CustomerPlan[]> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customer-plans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return data.map((cp: any) => ({
      ...cp,
      planId: cp.planId ?? cp.plan?.id ?? cp.plan_id ?? "",
      startDate: new Date(cp.startDate),
      endDate: cp.endDate ? new Date(cp.endDate) : undefined,
      createdAt: new Date(cp.createdAt),
      updatedAt: new Date(cp.updatedAt),
      customer: { name: cp.customer?.name ?? "" },
      plan: { name: cp.plan?.name ?? cp.planName ?? "" },
    }));
  },

  async getCustomerPlanById(id: string): Promise<CustomerPlan> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customer-plans/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cp = await handleResponse(response);
    return {
      ...cp,
      planId: cp.planId ?? cp.plan?.id ?? cp.plan_id ?? "",
      startDate: cp.startDate ? new Date(cp.startDate) : undefined,
      endDate: cp.endDate ? new Date(cp.endDate) : undefined,
      createdAt: new Date(cp.createdAt),
      updatedAt: new Date(cp.updatedAt),
      customer: { name: cp.customer?.name ?? "" },
      plan: { name: cp.plan?.name ?? cp.planName ?? "" },
    };
  },

  async createCustomerPlan(data: CreateCustomerPlanPayload): Promise<{ message: string; customerPlan: CustomerPlan }> {
    const token = getToken();
    console.log('Enviando solicitud a /api/customer-plans:', JSON.stringify(data, null, 2));
    try {
      const response = await fetch(`${API_URL}/customer-plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...data,
          startDate: data.startDate instanceof Date ? data.startDate.toISOString() : data.startDate,
          endDate: data.endDate ? data.endDate.toISOString() : null,
        }),
      });
      console.log('Respuesta de /api/customer-plans:', {
        status: response.status,
        statusText: response.statusText,
      });
      const result = await handleResponse(response);
      console.log('Resultado de createCustomerPlan:', JSON.stringify(result, null, 2));
      return {
        ...result,
        customerPlan: {
          ...result.customerPlan,
          startDate: new Date(result.customerPlan.startDate),
          endDate: result.customerPlan.endDate ? new Date(result.customerPlan.endDate) : undefined,
          createdAt: new Date(result.customerPlan.createdAt),
          updatedAt: new Date(result.customerPlan.updatedAt),
          customer: { name: result.customerPlan.customer.name },
          plan: { name: result.customerPlan.plan.name },
        },
      };
    } catch (err: any) {
      console.error('Error en createCustomerPlan:', {
        message: err.message,
        status: err.status,
        response: err.response ? JSON.stringify(err.response, null, 2) : null,
      });
      throw err;
    }
  },

  async updateCustomerPlan(id: string, data: any): Promise<any> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customer-plans/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    console.log('Respuesta de updateCustomerPlan:', JSON.stringify(result, null, 2)); // Log para depurar
    return {
      ...result,
      customerPlan: {
        ...result.customerPlan,
        startDate: result.customerPlan.startDate ? new Date(result.customerPlan.startDate) : undefined,
        endDate: result.customerPlan.endDate ? new Date(result.customerPlan.endDate) : undefined,
        createdAt: result.customerPlan.createdAt ? new Date(result.customerPlan.createdAt) : undefined,
        updatedAt: result.customerPlan.updatedAt ? new Date(result.customerPlan.updatedAt) : undefined,
        customer: result.customerPlan.customer ? { name: result.customerPlan.customer.name || 'Unknown' } : { name: 'Unknown' },
        plan: result.customerPlan.plan ? { name: result.customerPlan.plan.name || 'Unknown' } : { name: 'Unknown' },
      },
    };
  },

  async deleteCustomerPlan(id: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/customer-plans/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getTechnicians(): Promise<Technician[]> {
    const token = getToken();
    const response = await fetch(`${API_URL}/technicians`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return data.map((tech) => ({
      ...tech,
      createdAt: new Date(tech.createdAt),
    }));
  },

  async getTechnicianById(id: string): Promise<Technician> {
    const token = getToken();
    const response = await fetch(`${API_URL}/technicians/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return {
      ...data,
      createdAt: new Date(data.createdAt),
    };
  },

  async createTechnician(data: CreateTechnicianPayload): Promise<{ message: string; technician: Technician }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/technicians`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return {
      ...result,
      technician: {
        ...result.technician,
        createdAt: new Date(result.technician.createdAt),
      },
    };
  },

  async updateTechnician(id: string, data: Partial<Technician>): Promise<{ message: string; technician: Technician }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/technicians/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return {
      ...result,
      technician: {
        ...result.technician,
        createdAt: new Date(result.technician.createdAt),
      },
    };
  },

  async deleteTechnician(id: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/technicians/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getBillingAccountByCustomer(customerId: string): Promise<BillingAccount> {
    const token = getToken();
    const response = await fetch(`${API_URL}/billing/accounts/${customerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return {
      ...data,
      balance: parseFloat(data.balance),
      creditLimit: data.creditLimit != null ? parseFloat(data.creditLimit) : null,
      suspendedAt: data.suspendedAt ? new Date(data.suspendedAt) : null,
      lastPaymentDate: data.lastPaymentDate ? new Date(data.lastPaymentDate) : null,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt),
    };
  },

  async getBillingAccounts(params?: { status?: "pending" | "up-to-date" | "all" }): Promise<BillingAccount[]> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    const url = `${API_URL}/billing/accounts${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return data.map((account: any) => ({
      ...account,
      balance: parseFloat(account.balance),
      creditLimit: account.creditLimit != null ? parseFloat(account.creditLimit) : null,
      suspendedAt: account.suspendedAt ? new Date(account.suspendedAt) : null,
      lastPaymentDate: account.lastPaymentDate ? new Date(account.lastPaymentDate) : null,
      createdAt: new Date(account.createdAt),
      updatedAt: new Date(account.updatedAt),
      customer: {
        ...account.customer,
        customerPlans: (account.customer.customerPlans || []).map((cp: any) => ({
          ...cp,
          planId: cp.planId ?? cp.plan?.id ?? cp.plan_id ?? "",
          startDate: new Date(cp.startDate),
          endDate: cp.endDate ? new Date(cp.endDate) : undefined,
          createdAt: new Date(cp.createdAt),
          updatedAt: new Date(cp.updatedAt),
          plan: { name: cp.plan?.name ?? cp.planName ?? "", monthlyPrice: parseFloat(cp.plan?.monthlyPrice || 0) },
        })),
      },
    }));
  },

  async updateBillingAccount(id: string, data: Partial<BillingAccount>): Promise<{ message: string; account: BillingAccount }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/billing/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return {
      ...result,
      account: {
        ...result.account,
        balance: parseFloat(result.account.balance),
        creditLimit: result.account.creditLimit != null ? parseFloat(result.account.creditLimit) : null,
        suspendedAt: result.account.suspendedAt ? new Date(result.account.suspendedAt) : null,
        lastPaymentDate: result.account.lastPaymentDate ? new Date(result.account.lastPaymentDate) : null,
        createdAt: new Date(result.account.createdAt),
        updatedAt: new Date(result.account.updatedAt),
      },
    };
  },

  async createInvoice(payload: CreateInvoicePayload): Promise<{ message: string; invoice: Invoice }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/billing/invoices`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...payload,
        periodStart: payload.periodStart.toISOString(),
        periodEnd: payload.periodEnd.toISOString(),
        items: payload.items.map((i) => ({ ...i })),
      }),
    });
    const result = await handleResponse(response);
    const inv = result.invoice;
    return {
      ...result,
      invoice: {
        ...inv,
        subtotal: parseFloat(inv.subtotal),
        tax: parseFloat(inv.tax),
        discount: parseFloat(inv.discount),
        total: parseFloat(inv.total),
        balanceDue: parseFloat(inv.balanceDue),
        periodStart: new Date(inv.periodStart),
        periodEnd: new Date(inv.periodEnd),
        issueDate: new Date(inv.issueDate),
        dueDate: new Date(inv.dueDate),
        createdAt: new Date(inv.createdAt),
        updatedAt: new Date(inv.updatedAt),
        items: (inv.items || []).map((it: InvoiceItem) => ({
          ...it,
          quantity: typeof it.quantity === "string" ? parseFloat(it.quantity as any) : it.quantity,
          unitPrice: typeof it.unitPrice === "string" ? parseFloat(it.unitPrice as any) : it.unitPrice,
          total: typeof it.total === "string" ? parseFloat(it.total as any) : it.total,
        })),
      },
    };
  },

  async getInvoices(params?: { customerId?: string; status?: string; from?: Date; to?: Date; q?: string }): Promise<Invoice[]> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.customerId) qs.set("customerId", params.customerId);
    if (params?.status) qs.set("status", params.status);
    if (params?.from) qs.set("from", params.from.toISOString());
    if (params?.to) qs.set("to", params.to.toISOString());
    if (params?.q) qs.set("q", params.q);
    const url = `${API_URL}/billing/invoices${qs.toString() ? `?${qs.toString()}` : ""}`;

    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return data.map((inv: any) => ({
      ...inv,
      subtotal: parseFloat(inv.subtotal),
      tax: parseFloat(inv.tax),
      discount: parseFloat(inv.discount),
      total: parseFloat(inv.total),
      balanceDue: parseFloat(inv.balanceDue),
      periodStart: new Date(inv.periodStart),
      periodEnd: new Date(inv.periodEnd),
      issueDate: new Date(inv.issueDate),
      dueDate: new Date(inv.dueDate),
      createdAt: new Date(inv.createdAt),
      updatedAt: new Date(inv.updatedAt),
    }));
  },

  async getInvoiceById(id: string): Promise<Invoice> {
    const token = getToken();
    const response = await fetch(`${API_URL}/billing/invoices/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const inv = await handleResponse(response);
    return {
      ...inv,
      subtotal: parseFloat(inv.subtotal),
      tax: parseFloat(inv.tax),
      discount: parseFloat(inv.discount),
      total: parseFloat(inv.total),
      balanceDue: parseFloat(inv.balanceDue),
      periodStart: new Date(inv.periodStart),
      periodEnd: new Date(inv.periodEnd),
      issueDate: new Date(inv.issueDate),
      dueDate: new Date(inv.dueDate),
      createdAt: new Date(inv.createdAt),
      updatedAt: new Date(inv.updatedAt),
      items: (inv.items || []).map((it: any) => ({
        ...it,
        quantity: typeof it.quantity === "string" ? parseFloat(it.quantity) : it.quantity,
        unitPrice: typeof it.unitPrice === "string" ? parseFloat(it.unitPrice) : it.unitPrice,
        total: typeof it.total === "string" ? parseFloat(it.total) : it.total,
      })),
    };
  },

  async downloadInvoicePdf(invoiceId: string): Promise<void> {
    const token = getToken();
    const response = await fetch(`${API_URL}/billing/invoices/${invoiceId}/pdf`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Error al descargar el recibo");
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibo-${invoiceId}.pdf`;
    a.click();
    window.URL.revokeObjectURL(url);
  },

  async recordPayment(payload: RecordPaymentPayload): Promise<{ message: string; payment: Payment; invoice?: Invoice }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/billing/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        ...payload,
        paymentDate: (payload.paymentDate ?? new Date()).toISOString(),
      }),
    });
    const result = await handleResponse(response);
    const p = result.payment;
    return {
      ...result,
      payment: {
        ...p,
        amount: parseFloat(p.amount),
        paymentDate: new Date(p.paymentDate),
        processedDate: p.processedDate ? new Date(p.processedDate) : null,
        createdAt: new Date(p.createdAt),
        updatedAt: new Date(p.updatedAt),
      },
      invoice: result.invoice
        ? {
            ...result.invoice,
            subtotal: parseFloat(result.invoice.subtotal),
            tax: parseFloat(result.invoice.tax),
            discount: parseFloat(result.invoice.discount),
            total: parseFloat(result.invoice.total),
            balanceDue: parseFloat(result.invoice.balanceDue),
            periodStart: new Date(result.invoice.periodStart),
            periodEnd: new Date(result.invoice.periodEnd),
            issueDate: new Date(result.invoice.issueDate),
            dueDate: new Date(result.invoice.dueDate),
            createdAt: new Date(result.invoice.createdAt),
            updatedAt: new Date(result.invoice.updatedAt),
            items: (result.invoice.items || []).map((it: any) => ({
              ...it,
              quantity: typeof it.quantity === "string" ? parseFloat(it.quantity) : it.quantity,
              unitPrice: typeof it.unitPrice === "string" ? parseFloat(it.unitPrice) : it.unitPrice,
              total: typeof it.total === "string" ? parseFloat(it.total) : it.total,
            })),
          }
        : undefined,
    };
  },

  async getPayments(params?: { customerId?: string; from?: Date; to?: Date; method?: string }): Promise<Payment[]> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.customerId) qs.set("customerId", params.customerId);
    if (params?.from) qs.set("from", params.from.toISOString());
    if (params?.to) qs.set("to", params.to.toISOString());
    if (params?.method) qs.set("method", params.method);
    const url = `${API_URL}/billing/payments${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return data.map((p: any) => ({
      ...p,
      amount: parseFloat(p.amount),
      paymentDate: new Date(p.paymentDate),
      processedDate: p.processedDate ? new Date(p.processedDate) : null,
      createdAt: new Date(p.createdAt),
      updatedAt: new Date(p.updatedAt),
    }));
  },

  async getCustomerPlansFiltered(params?: { customerId?: string; planId?: string; status?: string }): Promise<CustomerPlan[]> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.customerId) qs.set("customerId", params.customerId);
    if (params?.planId) qs.set("planId", params.planId);
    if (params?.status) qs.set("status", params.status);
    const url = `${API_URL}/customer-plans${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return (data || []).map((cp: any) => ({
      ...cp,
      planId: cp.planId ?? cp.plan?.id ?? cp.plan_id ?? "",
      startDate: new Date(cp.startDate),
      endDate: cp.endDate ? new Date(cp.endDate) : undefined,
      createdAt: new Date(cp.createdAt),
      updatedAt: new Date(cp.updatedAt),
      customer: { name: cp.customer?.name ?? "" },
      plan: { name: cp.plan?.name ?? cp.planName ?? "" },
    }));
  },

  async getTickets(params?: { customerId?: string; status?: string; category?: string; page?: number; limit?: number }): Promise<{ data: Ticket[]; totalPages?: number }> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.customerId) qs.set("customerId", params.customerId);
    if (params?.status) qs.set("status", params.status);
    if (params?.category) qs.set("category", params.category);
    if (params?.page) qs.set("page", params.page.toString());
    if (params?.limit) qs.set("limit", params.limit.toString());
    const url = `${API_URL}/tickets${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    const tickets = Array.isArray(data) ? data : (data?.data || []);
    return {
      data: tickets.map((ticket: any) => ({
        ...ticket,
        createdAt: new Date(ticket.createdAt),
        updatedAt: new Date(ticket.updatedAt),
        dueDate: ticket.dueDate ? new Date(ticket.dueDate) : null,
        customer: { name: ticket.customer?.name ?? "" },
        assignedTechnician: ticket.technician ? { name: ticket.technician.name } : null,
      })),
      totalPages: data?.totalPages || 1,
    };
  },

  async getTicketById(id: string): Promise<Ticket> {
    const token = getToken();
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const ticket = await handleResponse(response);
    return {
      ...ticket,
      createdAt: new Date(ticket.createdAt),
      updatedAt: new Date(ticket.updatedAt),
      dueDate: ticket.dueDate ? new Date(ticket.dueDate) : null,
      estimatedCost: parseFloat(ticket.estimatedCost || 0),
      actualCost: parseFloat(ticket.actualCost || 0),
      estimatedHours: parseFloat(ticket.estimatedHours || 0),
      actualHours: parseFloat(ticket.actualHours || 0),
      customer: ticket.customer ? { name: ticket.customer.name, phone: ticket.customer.phone } : null,
      assignedTechnician: ticket.technician ? { name: ticket.technician.name, phone: ticket.technician.phone } : null,
      attachments: ticket.attachments || [],
      history: ticket.history || [],
      workLogs: ticket.workLogs || [],
      rating: ticket.rating || null,
    };
  },

  async createTicket(data: CreateTicketPayload): Promise<{ message: string; ticket: Ticket }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return {
      ...result,
      ticket: {
        ...result.ticket,
        createdAt: new Date(result.ticket.createdAt),
        updatedAt: new Date(result.ticket.updatedAt),
        dueDate: result.ticket.dueDate ? new Date(result.ticket.dueDate) : null,
        customer: result.ticket.customer ? { name: result.ticket.customer.name } : { name: "Cliente no encontrado" },
        assignedTechnician: result.ticket.assignedTechnician ? { name: result.ticket.assignedTechnician.name } : null,
      },
    };
  },

  async updateTicket(id: string, data: Partial<Ticket>): Promise<{ message: string; ticket: Ticket }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return {
      ...result,
      ticket: {
        ...result.ticket,
        createdAt: new Date(result.ticket.createdAt),
        updatedAt: new Date(result.ticket.updatedAt),
        dueDate: result.ticket.dueDate ? new Date(result.ticket.dueDate) : null,
        customer: result.ticket.customer ? { name: result.ticket.customer.name } : { name: "Cliente no encontrado" },
        assignedTechnician: result.ticket.assignedTechnician ? { name: result.ticket.assignedTechnician.name } : null,
      },
    };
  },

  async updateTicketStatus(id: string, status: string): Promise<{ message: string; ticket: Ticket }> {
    const token = getToken();
    const payload = { status };
    console.log("📤 Enviando updateTicketStatus:", { id, status, payload });
    const response = await fetch(`${API_URL}/tickets/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    console.log("📥 Respuesta updateTicketStatus:", response.status, response.statusText);
    return handleResponse(response);
  },

  async deleteTicket(id: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/tickets/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async addAttachment(ticketId: string, file: File): Promise<{ message: string; attachment: any }> {
    const token = getToken();
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${API_URL}/tickets/${ticketId}/attachments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return handleResponse(response);
  },

  async addRating(ticketId: string, data: { rating: number; comment?: string }): Promise<{ message: string; rating: any }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/tickets/${ticketId}/rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  async getTicketHistory(ticketId: string): Promise<any[]> {
    const token = getToken();
    const response = await fetch(`${API_URL}/tickets/${ticketId}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return data.map((entry: any) => ({
      ...entry,
      createdAt: new Date(entry.createdAt),
    }));
  },

  async getNotifications(params?: { customerId?: string; from?: Date; to?: Date }): Promise<MessageLog[]> {
    const token = getToken();
    const qs = new URLSearchParams();
    if (params?.customerId) qs.set("customerId", params.customerId);
    if (params?.from) qs.set("from", params.from.toISOString());
    if (params?.to) qs.set("to", params.to.toISOString());
    const url = `${API_URL}/notifications${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return data.map((msg: any) => ({
      ...msg,
      sentAt: new Date(msg.sentAt),
      deliveredAt: msg.deliveredAt ? new Date(msg.deliveredAt) : null,
      readAt: msg.readAt ? new Date(msg.readAt) : null,
      createdAt: new Date(msg.createdAt),
      updatedAt: new Date(msg.updatedAt),
    }));
  },

  async sendManualReminder(customerId: string): Promise<{ message: string }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/dunning/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ customerId }),
    });
    return handleResponse(response);
  },

  async getRevenueReport(params: { from: Date; to: Date }): Promise<{ month: string; amount: number }[]> {
    const token = getToken();
    const qs = new URLSearchParams();
    qs.set("from", params.from.toISOString());
    qs.set("to", params.to.toISOString());
    const url = `${API_URL}/reports/revenue${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return data.map((item: any) => ({
      month: item.month,
      amount: parseFloat(item.amount),
    }));
  },

  async getTicketStatusReport(): Promise<{ status: string; count: number }[]> {
    const token = getToken();
    const response = await fetch(`${API_URL}/reports/ticket-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await handleResponse(response);
    return data.map((item: any) => ({
      status: item.status,
      count: item.count,
    }));
  },

  async getMikrotikProfiles(): Promise<any[]> {
    const token = getToken();
    const response = await fetch(`${API_URL}/mikrotik-profiles/from-any-router`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },// ============= ROUTERS API ============= 
  // Reemplaza TODA la sección de routers en apiFacade.ts
  
  async getRouters(token: string, withMetrics: boolean = false): Promise<Router[]> {
    const endpoint = withMetrics ? '/routers/with-metrics' : '/routers';
    const url = `${API_URL}${endpoint}`;
    
    console.log('🔍 Fetching routers from:', url);
    
    const makeRequest = async (currentToken: string) => {
      return fetch(url, {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
    };
    
    try {
      const response = await makeRequest(token);
      
      // Si falla con 401/403, intentar refrescar y reintentar
      if (response.status === 401 || response.status === 403) {
        console.log("🔄 Token inválido, intentando refrescar...");
        try {
          const newToken = await refreshToken();
          console.log("✅ Token refrescado, reintentando...");
          const newResponse = await makeRequest(newToken);
          const result = await handleResponse(newResponse);
          
          // El backend devuelve { success: true, data: [...] }
          if (result && result.success && Array.isArray(result.data)) {
            return result.data;
          }
          if (Array.isArray(result)) {
            return result;
          }
          return result.data || [];
        } catch (refreshError) {
          console.error("❌ Error al refrescar token:", refreshError);
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          localStorage.removeItem("user_data");
          if (typeof window !== 'undefined') {
            window.location.href = "/auth";
          }
          throw new Error("Sesión expirada. Por favor, inicia sesión nuevamente.");
        }
      }
      
      const result = await handleResponse(response, () => makeRequest(token));
      console.log('✅ Routers response:', result);
      
      // El backend devuelve { success: true, data: [...] }
      if (result && result.success && Array.isArray(result.data)) {
        return result.data;
      }
      
      // Si viene directamente como array
      if (Array.isArray(result)) {
        return result;
      }
      
      // Si viene con estructura diferente
      return result.data || [];
    } catch (error: any) {
      console.error('❌ Error fetching routers:', error);
      throw error;
    }
  },
  
  async getRouterById(token: string, id: string): Promise<Router> {
    const response = await fetch(`${API_URL}/routers/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const result = await handleResponse(response);
    return result.data || result;
  },
  
  async createRouter(token: string, payload: any): Promise<any> {
    console.log('🔍 createRouter - Iniciando request...');
    console.log('🔍 createRouter - URL:', `${API_URL}/routers`);
    console.log('🔍 createRouter - Payload:', payload);
    
    const response = await fetch(`${API_URL}/routers`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(payload),
    });
    
    console.log('🔍 createRouter - Response status:', response.status);
    console.log('🔍 createRouter - Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await handleResponse(response);
    console.log('🔍 createRouter - Final result:', result);
    return result;
  },
  
  async updateRouter(token: string, id: string, data: Partial<Router>): Promise<Router> {
    const response = await fetch(`${API_URL}/routers/${id}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify(data),
    });
    const result = await handleResponse(response);
    return result.data || result;
  },
  
  async deleteRouter(token: string, id: string): Promise<{ message: string }> {
    const response = await fetch(`${API_URL}/routers/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  // ===== MIKROTIK PROFILES =====
  async syncMikrotikProfiles(routerId: string): Promise<{ message: string; data: any[] }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/mikrotik-profiles/sync/${routerId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getMikrotikProfilesFromRouter(routerId: string): Promise<{ message: string; data: any[] }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/mikrotik-profiles/router/${routerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async getSyncedMikrotikPlans(): Promise<{ message: string; data: any[] }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/mikrotik-profiles/synced-plans`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },

  async testMikrotikConnection(routerId: string): Promise<{ message: string; data: any }> {
    const token = getToken();
    const response = await fetch(`${API_URL}/mikrotik-profiles/test-connection/${routerId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },
  
  async testRouterConnection(token: string, data: {
    ipAddress: string;
    apiPort: number;
    username: string;
    password: string;
    useTls: boolean;
  }) {
    console.log('🔍 Enviando datos de test-connection:', { ...data, password: '***' });
    
    const response = await fetch(`${API_URL}/routers/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    console.log('📥 Respuesta de test-connection:', response.status, response.statusText);
    
    // Si hay error, leer el cuerpo antes de handleResponse
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error del servidor:', errorText);
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error || errorData.message || 'Error al conectar');
      } catch (e) {
        throw new Error(errorText || 'Error al conectar con el router');
      }
    }
    
    return handleResponse(response);
  },
  
  async testRouterConnectionById(token: string, id: string) {
    const response = await fetch(`${API_URL}/routers/${id}/test`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse(response);
  },
  
  async getRouterZones(token: string): Promise<RouterZone[]> {
    const response = await fetch(`${API_URL}/routers/zones`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await handleResponse(response);
    return data.data || data;
  },
  
  async getDistricts(token: string): Promise<string[]> {
    const response = await fetch(`${API_URL}/routers/districts`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    const data = await handleResponse(response);
    return data.data || data;
  },
  // apiFacade.ts
async sendManualReminder(customerId: string): Promise<{ message: string }> {
  const token = getToken();
  try {
    const response = await fetch(`${API_URL}/dunning/reminders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ customerId }),
    });
    const result = await handleResponse(response);
    
    // Si el estado no es satisfactorio, consideramos que hubo un error
    if (result.status !== "SENT") {
      // Actualizar la notificación en caso de error
      await apiFacade.updateNotificationStatus(customerId, "FAILED", result.errorMessage);
    }

    return result;
  } catch (err) {
    throw new Error("Error al enviar el recordatorio");
  }
},
// ============================================
// REEMPLAZA TODA LA SECCIÓN DE NOTIFICACIONES
// (Borra desde "async getNotifications" hasta "async sendManualReminder")
// ============================================

// ============= NOTIFICATIONS API =============

/**
 * Obtiene el historial de notificaciones con filtros opcionales
 */
async getNotifications(params?: { 
  customerId?: string; 
  from?: Date; 
  to?: Date 
}): Promise<MessageLog[]> {
  const token = getToken();
  const qs = new URLSearchParams();
  
  if (params?.customerId) qs.set("customerId", params.customerId);
  if (params?.from) qs.set("from", params.from.toISOString());
  if (params?.to) qs.set("to", params.to.toISOString());
  
  const url = `${API_URL}/notifications${qs.toString() ? `?${qs.toString()}` : ""}`;
  
  const response = await fetch(url, { 
    headers: { Authorization: `Bearer ${token}` } 
  });
  
  const data = await handleResponse(response);
  
  return data.map((msg: any) => ({
    ...msg,
    sentAt: new Date(msg.sentAt),
    deliveredAt: msg.deliveredAt ? new Date(msg.deliveredAt) : null,
    readAt: msg.readAt ? new Date(msg.readAt) : null,
    createdAt: new Date(msg.createdAt),
    updatedAt: new Date(msg.updatedAt),
  }));
},

/**
 * Envía una notificación individual a un cliente
 */
async sendNotification(data: { 
  customerId: string; 
  message: string; 
  invoiceId?: string 
}): Promise<{ message: string; notification: MessageLog }> {
  const token = getToken();
  
  const response = await fetch(`${API_URL}/notifications/send`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  
  const result = await handleResponse(response);
  
  return {
    message: result.message,
    notification: {
      ...result.notification,
      sentAt: new Date(result.notification.sentAt),
      createdAt: new Date(result.notification.createdAt),
      updatedAt: new Date(result.notification.updatedAt),
    }
  };
},

/**
 * Envía notificaciones masivas a múltiples clientes
 */
async sendBulkNotifications(data: { 
  customerIds: string[]; 
  message: string 
}): Promise<{
  message: string;
  sent: number;
  failed: number;
  results: any[];
  errors: any[];
}> {
  const token = getToken();
  
  const response = await fetch(`${API_URL}/notifications/send-bulk`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify(data),
  });
  
  return handleResponse(response);
},

/**
 * Reenvía una notificación existente
 */
async resendNotification(notificationId: string): Promise<{ 
  message: string; 
  notification: MessageLog 
}> {
  const token = getToken();
  
  const response = await fetch(`${API_URL}/notifications/${notificationId}/resend`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}` 
    },
  });
  
  const result = await handleResponse(response);
  
  return {
    message: result.message,
    notification: {
      ...result.notification,
      sentAt: new Date(result.notification.sentAt),
      createdAt: new Date(result.notification.createdAt),
      updatedAt: new Date(result.notification.updatedAt),
    }
  };
},

/**
 * DEPRECATED: Usar sendNotification en su lugar
 * Mantener por compatibilidad con código existente (dunning)
 */
async sendManualReminder(customerId: string): Promise<{ message: string }> {
  const token = getToken();
  
  const response = await fetch(`${API_URL}/dunning/reminders`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json", 
      Authorization: `Bearer ${token}` 
    },
    body: JSON.stringify({ customerId }),
  });
  
  return handleResponse(response);
},

/**
 * Generar deudas mensuales manualmente
 */
async generateMonthlyDebt(): Promise<{
  message: string;
  result: any;
}> {
  const makeRequest = async () => {
    const token = getToken();
    return fetch(`${API_URL}/billing/generate-debt`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        Authorization: `Bearer ${token}` 
      },
    });
  };
  
  const response = await makeRequest();
  return handleResponse(response, makeRequest);
},

// ===== ADVANCE PAYMENTS =====
async createAdvancePayment(payload: CreateAdvancePaymentPayload): Promise<{ message: string; advancePayment: AdvancePayment; monthlyPayments: AdvanceMonthlyPayment[] }> {
  const token = getToken();
  const response = await fetch(`${API_URL}/advance-payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  return handleResponse(response);
},

async getAdvancePaymentsByCustomer(customerId: string): Promise<AdvancePayment[]> {
  const token = getToken();
  const response = await fetch(`${API_URL}/advance-payments/customer/${customerId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
},

async getAllAdvancePayments(filters?: { status?: string; customerId?: string }): Promise<AdvancePayment[]> {
  const token = getToken();
  const queryParams = new URLSearchParams();
  if (filters?.status) queryParams.append('status', filters.status);
  if (filters?.customerId) queryParams.append('customerId', filters.customerId);
  
  const url = `${API_URL}/advance-payments${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
},

async deleteAdvancePayment(advancePaymentId: string): Promise<{ message: string; advancePayment: AdvancePayment }> {
  const token = getToken();
  const response = await fetch(`${API_URL}/advance-payments/${advancePaymentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
},

async applyAdvancePaymentsToPending(): Promise<{ message: string; appliedCount: number; totalInvoices: number }> {
  const token = getToken();
  const response = await fetch(`${API_URL}/advance-payments/apply-to-pending`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
},

// ===== LIST PAYMENTS =====
async listPayments(params?: { customerId?: string; from?: string; to?: string; method?: string }): Promise<any[]> {
  const token = getToken();
  const qs = new URLSearchParams();
  if (params?.customerId) qs.set("customerId", params.customerId);
  if (params?.from) qs.set("from", params.from);
  if (params?.to) qs.set("to", params.to);
  if (params?.method) qs.set("method", params.method);
  
  const url = `${API_URL}/billing/payments${qs.toString() ? `?${qs.toString()}` : ""}`;
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  return handleResponse(response);
},

// ===== DELETE PAYMENT =====
async deletePayment(paymentId: string): Promise<{ message: string; payment: any }> {
  const token = getToken();
  const response = await fetch(`${API_URL}/billing/payments/${paymentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handleResponse(response);
},

// ============= DUNNING API =============
  /**
   * Corta el servicio a todos los clientes morosos
   * @param cutProfile - Perfil de corte a aplicar (opcional, por defecto 'CORTE MOROSO')
   */
  async cutAllOverdueCustomers(cutProfile?: string): Promise<{
    success: boolean;
    message: string;
    data: {
      total: number;
      cut: number;
      failed: number;
      results: Array<{
        customerId: string;
        customerName: string;
        username?: string;
        routerName?: string;
        status: 'success' | 'failed' | 'skipped';
        message: string;
      }>;
    };
  }> {
    const token = getToken();
    if (!token) {
      throw new Error("No hay token de autenticación. Por favor, inicia sesión nuevamente.");
    }

    console.log('🔪 Iniciando corte masivo, URL:', `${API_URL}/dunning/cut-all-overdue`);
    console.log('🔑 Token presente:', token ? 'Sí' : 'No');
    
    try {
      const response = await fetch(`${API_URL}/dunning/cut-all-overdue`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ cutProfile }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', response.status, errorText);
        
        if (response.status === 401 || response.status === 403) {
          throw new Error("Token inválido o expirado. Por favor, inicia sesión nuevamente.");
        }
        
        if (response.status === 500) {
          throw new Error("Error interno del servidor. Intenta nuevamente más tarde.");
        }
        
        throw new Error(`Error del servidor: ${response.status}`);
      }
      
      return handleResponse(response);
    } catch (error: any) {
      console.error('❌ Error en cutAllOverdueCustomers:', error);
      
      if (error.message === "Failed to fetch" || error.name === "TypeError" || error.code === "ECONNREFUSED") {
        throw new Error(`No se pudo conectar al servidor en ${API_URL}. Verifica que el backend esté corriendo.`);
      }
      
      throw error;
    }
  },

  async getPaymentReport(filters: {
    createdBy?: string;
    from?: string;
    to?: string;
    deviceId?: string;
    customerId?: string;
    paymentMethod?: string;
  }): Promise<{
    payments: any[];
    summary: {
      totalPayments: number;
      totalAmount: number;
      byMethod: Record<string, { count: number; total: number }>;
    };
  }> {
    const token = getToken();
    const qs = new URLSearchParams();
    
    if (filters.createdBy) qs.append("createdBy", filters.createdBy);
    if (filters.from) qs.append("from", filters.from);
    if (filters.to) qs.append("to", filters.to);
    if (filters.deviceId) qs.append("deviceId", filters.deviceId);
    if (filters.customerId) qs.append("customerId", filters.customerId);
    if (filters.paymentMethod) qs.append("paymentMethod", filters.paymentMethod);

    const url = `${API_URL}/reports/payments${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    const data = await handleResponse(response);
    
    return {
      payments: data.payments.map((p: any) => ({
        ...p,
        paymentDate: new Date(p.paymentDate),
        amount: parseFloat(p.amount),
      })),
      summary: {
        totalPayments: data.summary.totalPayments,
        totalAmount: parseFloat(data.summary.totalAmount),
        byMethod: data.summary.byMethod,
      },
    };
  },

  async downloadPaymentReportPdf(filters: {
    createdBy?: string;
    from?: string;
    to?: string;
    deviceId?: string;
    customerId?: string;
    paymentMethod?: string;
  }): Promise<void> {
    const token = getToken();
    const qs = new URLSearchParams();
    
    if (filters.createdBy) qs.append("createdBy", filters.createdBy);
    if (filters.from) qs.append("from", filters.from);
    if (filters.to) qs.append("to", filters.to);
    if (filters.deviceId) qs.append("deviceId", filters.deviceId);
    if (filters.customerId) qs.append("customerId", filters.customerId);
    if (filters.paymentMethod) qs.append("paymentMethod", filters.paymentMethod);

    const url = `${API_URL}/reports/payments/pdf${qs.toString() ? `?${qs.toString()}` : ""}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: `Error ${response.status}` }));
      throw new Error(error.error || `Error ${response.status}`);
    }

    // Descargar el PDF
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `reporte-pagos-${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },
};



export default apiFacade;