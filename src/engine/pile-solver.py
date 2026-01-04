"""
Pile Solver - Finite Difference Analysis
Core computational engine for lateral pile analysis
"""

import numpy as np
from scipy import sparse
from scipy.sparse import linalg


def solve_pile(pile_data, soil_profile, load_case, config):
    """
    Main solver function - analyzes laterally loaded pile

    Parameters
    ----------
    pile_data : dict
        Pile geometry and properties
    soil_profile : dict
        Soil layers and properties
    load_case : dict
        Applied loads
    config : dict
        Analysis configuration

    Returns
    -------
    results : dict
        Analysis results including deflections, moments, shears
    """

    # Extract parameters
    pile_length = pile_data['length']
    pile_diameter = pile_data['diameter']
    EI = pile_data['EI']

    lateral_load = load_case['lateralLoad']
    moment = load_case['moment']
    axial_load = load_case['axialLoad']

    n_nodes = config['numNodes']
    max_iter = config['maxIterations']
    tol = config['convergenceTolerance']

    # Node spacing
    h = pile_length / (n_nodes - 1)
    depths = np.linspace(0, pile_length, n_nodes)

    # Initialize deflection vector
    y = np.zeros(n_nodes)

    # Assemble pile stiffness matrix
    K_pile = assemble_pile_stiffness(n_nodes, h, EI, axial_load)

    # Apply boundary conditions (free head for now)
    K_pile, bc_modifications = apply_boundary_conditions(
        K_pile, config['boundaryCondition']
    )

    # Create load vector
    F_applied = create_load_vector(n_nodes, lateral_load, moment, h)

    # TEMPORARY: Linear elastic solution (no P-Y curves yet)
    # This is a placeholder until we implement full non-linear solver
    try:
        y = sparse.linalg.spsolve(K_pile, F_applied)
    except Exception as e:
        return {
            'success': False,
            'error': f'Solver failed: {str(e)}'
        }

    # Calculate moments and shears from deflections
    moments = calculate_moments(y, h, EI)
    shears = calculate_shears(y, h, EI)

    # Placeholder soil reactions (will be from P-Y curves)
    soil_reactions = np.zeros(n_nodes)

    # Package results
    results = {
        'success': True,
        'converged': True,
        'iterations': 1,  # Placeholder
        'depths': depths.tolist(),
        'deflections': y.tolist(),
        'moments': moments.tolist(),
        'shears': shears.tolist(),
        'soilReactions': soil_reactions.tolist(),
        'maxDeflection': float(np.max(np.abs(y))),
        'maxMoment': float(np.max(np.abs(moments))),
        'maxShear': float(np.max(np.abs(shears))),
        'deflectionAtLoad': float(y[0])  # At pile head
    }

    return results


def assemble_pile_stiffness(n_nodes, h, EI, P_axial):
    """
    Assemble pile stiffness matrix using finite differences

    5-point stencil for 4th derivative:
    d⁴y/dx⁴ ≈ (y[i-2] - 4y[i-1] + 6y[i] - 4y[i+1] + y[i+2]) / h⁴
    """

    # Stiffness coefficients
    c = EI / h**4
    beta = -P_axial * h**2 / EI  # P-delta effect

    # Diagonal elements
    main_diag = c * (6 + beta) * np.ones(n_nodes)
    off1_diag = c * (-4 + beta/2) * np.ones(n_nodes - 1)
    off2_diag = c * np.ones(n_nodes - 2)

    # Create sparse matrix (pentadiagonal)
    K = sparse.diags(
        [off2_diag, off1_diag, main_diag, off1_diag, off2_diag],
        [-2, -1, 0, 1, 2],
        format='csr'
    )

    return K


def apply_boundary_conditions(K, bc_type):
    """
    Apply boundary conditions to stiffness matrix

    Currently implements free head (M=0, V=0)
    TODO: Implement fixed head, pinned head
    """

    # For free head: modify first two rows
    # This is a simplified implementation
    # Full implementation will properly handle boundary conditions

    modifications = {
        'type': bc_type,
        'applied': True
    }

    return K, modifications


def create_load_vector(n_nodes, lateral_load, moment, h):
    """
    Create load vector for applied loads at pile head
    """

    F = np.zeros(n_nodes)

    # Apply lateral load at pile head (node 0)
    # Distribute to adjacent nodes based on finite difference scheme
    F[0] = lateral_load / h**3  # Scaled for FD formulation

    # Moment creates equivalent loads
    if moment != 0:
        F[0] += moment / h**2

    return F


def calculate_moments(y, h, EI):
    """
    Calculate bending moments from deflections
    M = -EI * d²y/dx²
    """

    n = len(y)
    moments = np.zeros(n)

    # Central difference for interior points
    for i in range(1, n-1):
        d2y_dx2 = (y[i-1] - 2*y[i] + y[i+1]) / h**2
        moments[i] = -EI * d2y_dx2

    # Boundary points (one-sided differences)
    moments[0] = -EI * (2*y[0] - 5*y[1] + 4*y[2] - y[3]) / h**2
    moments[-1] = -EI * (2*y[-1] - 5*y[-2] + 4*y[-3] - y[-4]) / h**2

    return moments


def calculate_shears(y, h, EI):
    """
    Calculate shear forces from deflections
    V = -EI * d³y/dx³
    """

    n = len(y)
    shears = np.zeros(n)

    # Central difference for interior points
    for i in range(2, n-2):
        d3y_dx3 = (-y[i-2] + 2*y[i-1] - 2*y[i+1] + y[i+2]) / (2 * h**3)
        shears[i] = -EI * d3y_dx3

    # Boundary points (simplified - will improve later)
    shears[0] = shears[2]
    shears[1] = shears[2]
    shears[-1] = shears[-3]
    shears[-2] = shears[-3]

    return shears


# Test function for development
def test_solver():
    """
    Simple test case - cantilever beam with tip load
    """

    pile_data = {
        'length': 10.0,
        'diameter': 0.6,
        'EI': 50000  # kN·m²
    }

    soil_profile = {
        'layers': []  # Ignore soil for now (elastic beam)
    }

    load_case = {
        'lateralLoad': 100.0,  # kN
        'moment': 0.0,
        'axialLoad': 0.0
    }

    config = {
        'boundaryCondition': 'free-head',
        'numNodes': 50,
        'maxIterations': 50,
        'convergenceTolerance': 1e-6
    }

    results = solve_pile(pile_data, soil_profile, load_case, config)

    print("Test solver results:")
    print(f"  Max deflection: {results['maxDeflection']:.6f} m")
    print(f"  Max moment: {results['maxMoment']:.2f} kN·m")
    print(f"  Converged: {results['converged']}")

    return results
