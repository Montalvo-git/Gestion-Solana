use anchor_lang::prelude::*;

declare_id!("9iimuNCbQyiLd1bryUAp8tuBaARox94rzKmqTJmDvQCW");

#[program]
pub mod reloj_inventory {
    use super::*;

    pub fn crear_reloj(
        ctx: Context<CrearReloj>,
        marca: String,
        modelo: String,
        piezas: u32,
        disponible: bool,
    ) -> Result<()> {
        let reloj = &mut ctx.accounts.reloj;
        let clock = Clock::get()?;

        require!(marca.len() <= 50, ErrorCode::MarcaMuyLarga);
        require!(modelo.len() <= 50, ErrorCode::ModeloMuyLargo);

        reloj.propietario = ctx.accounts.propietario.key();
        reloj.marca = marca;
        reloj.modelo = modelo;
        reloj.piezas = piezas;
        reloj.disponible = disponible;
        reloj.fecha_creacion = clock.unix_timestamp;
        reloj.fecha_actualizacion = clock.unix_timestamp;
        reloj.bump = ctx.bumps.reloj;

        msg!("Reloj creado: {} {}", reloj.marca, reloj.modelo);
        Ok(())
    }

    pub fn actualizar_reloj(
        ctx: Context<ActualizarReloj>,
        marca: Option<String>,
        modelo: Option<String>,
        piezas: Option<u32>,
        disponible: Option<bool>,
    ) -> Result<()> {
        let reloj = &mut ctx.accounts.reloj;
        let clock = Clock::get()?;

        if let Some(nueva_marca) = marca {
            require!(nueva_marca.len() <= 50, ErrorCode::MarcaMuyLarga);
            reloj.marca = nueva_marca;
        }

        if let Some(nuevo_modelo) = modelo {
            require!(nuevo_modelo.len() <= 50, ErrorCode::ModeloMuyLargo);
            reloj.modelo = nuevo_modelo;
        }

        if let Some(nuevas_piezas) = piezas {
            reloj.piezas = nuevas_piezas;
        }

        if let Some(nuevo_disponible) = disponible {
            reloj.disponible = nuevo_disponible;
        }

        reloj.fecha_actualizacion = clock.unix_timestamp;

        msg!("Reloj actualizado: {} {}", reloj.marca, reloj.modelo);
        Ok(())
    }

    pub fn eliminar_reloj(_ctx: Context<EliminarReloj>) -> Result<()> {
        msg!("Reloj eliminado del inventario");
        Ok(())
    }

    pub fn cambiar_disponibilidad(
        ctx: Context<ActualizarReloj>,
        disponible: bool,
    ) -> Result<()> {
        let reloj = &mut ctx.accounts.reloj;
        let clock = Clock::get()?;

        reloj.disponible = disponible;
        reloj.fecha_actualizacion = clock.unix_timestamp;

        msg!(
            "Disponibilidad cambiada a {} para: {} {}",
            disponible,
            reloj.marca,
            reloj.modelo
        );
        Ok(())
    }

    pub fn actualizar_piezas(ctx: Context<ActualizarReloj>, piezas: u32) -> Result<()> {
        let reloj = &mut ctx.accounts.reloj;
        let clock = Clock::get()?;

        reloj.piezas = piezas;
        reloj.fecha_actualizacion = clock.unix_timestamp;

        msg!(
            "Piezas actualizadas a {} para: {} {}",
            piezas,
            reloj.marca,
            reloj.modelo
        );
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(marca: String, modelo: String)]
pub struct CrearReloj<'info> {
    #[account(
        init,
        payer = propietario,
        space = 8 + Reloj::INIT_SPACE,
        seeds = [b"reloj", propietario.key().as_ref(), marca.as_bytes(), modelo.as_bytes()],
        bump
    )]
    pub reloj: Account<'info, Reloj>,
    
    #[account(mut)]
    pub propietario: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ActualizarReloj<'info> {
    #[account(
        mut,
        seeds = [b"reloj", propietario.key().as_ref(), reloj.marca.as_bytes(), reloj.modelo.as_bytes()],
        bump = reloj.bump,
        has_one = propietario
    )]
    pub reloj: Account<'info, Reloj>,
    
    #[account(mut)]
    pub propietario: Signer<'info>,
}

#[derive(Accounts)]
pub struct EliminarReloj<'info> {
    #[account(
        mut,
        close = propietario,
        seeds = [b"reloj", propietario.key().as_ref(), reloj.marca.as_bytes(), reloj.modelo.as_bytes()],
        bump = reloj.bump,
        has_one = propietario
    )]
    pub reloj: Account<'info, Reloj>,
    
    #[account(mut)]
    pub propietario: Signer<'info>,
}

#[account]
#[derive(InitSpace)]
pub struct Reloj {
    pub propietario: Pubkey,
    #[max_len(50)]
    pub marca: String,
    #[max_len(50)]
    pub modelo: String,
    pub piezas: u32,
    pub disponible: bool,
    pub fecha_creacion: i64,
    pub fecha_actualizacion: i64,
    pub bump: u8,
}

#[error_code]
pub enum ErrorCode {
    #[msg("La marca no puede tener más de 50 caracteres")]
    MarcaMuyLarga,
    #[msg("El modelo no puede tener más de 50 caracteres")]
    ModeloMuyLargo,
}
